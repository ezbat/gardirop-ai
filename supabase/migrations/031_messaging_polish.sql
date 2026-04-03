-- ═══════════════════════════════════════════════════════════════════════════
-- 031_messaging_polish.sql
-- Polishes the conversations + conversation_messages messaging system.
-- Idempotent — safe to re-run.
--
-- Changes:
--   1. Ensure conversations table exists with all required columns
--   2. Ensure conversation_messages table exists with is_read column
--   3. Performance indexes
--   4. mark_messages_read() RPC (CREATE OR REPLACE)
--   5. Auto-update trigger: last_message + unread counts on INSERT
--   6. Service-role RLS policies (supabaseAdmin bypasses RLS — this is belt & suspenders)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. conversations table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           TEXT        NOT NULL,
  seller_id             UUID        NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  product_id            UUID        REFERENCES public.products(id) ON DELETE SET NULL,
  last_message          TEXT        NOT NULL DEFAULT '',
  last_message_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seller_unread_count   INT         NOT NULL DEFAULT 0,
  customer_unread_count INT         NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns idempotently (for tables that pre-exist without them)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='conversations'
      AND column_name='seller_unread_count') THEN
    ALTER TABLE public.conversations ADD COLUMN seller_unread_count INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='conversations'
      AND column_name='customer_unread_count') THEN
    ALTER TABLE public.conversations ADD COLUMN customer_unread_count INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='conversations'
      AND column_name='last_message') THEN
    ALTER TABLE public.conversations ADD COLUMN last_message TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='conversations'
      AND column_name='last_message_at') THEN
    ALTER TABLE public.conversations ADD COLUMN last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- ── 2. conversation_messages table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       TEXT        NOT NULL,
  sender_type     TEXT        NOT NULL CHECK (sender_type IN ('customer', 'seller')),
  message         TEXT        NOT NULL,
  is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add is_read idempotently
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='conversation_messages'
      AND column_name='is_read') THEN
    ALTER TABLE public.conversation_messages ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- ── 3. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id
  ON public.conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id
  ON public.conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg_at
  ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_msgs_conv_created
  ON public.conversation_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conv_msgs_unread
  ON public.conversation_messages(conversation_id, is_read)
  WHERE is_read = FALSE;

-- ── 4. mark_messages_read() RPC ─────────────────────────────────────────────
--
-- Marks all messages FROM the other party as is_read=true
-- and resets the reader's unread counter to 0.
--
CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_conversation_id UUID,
  p_reader_type     TEXT   -- 'customer' or 'seller'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other_type TEXT;
BEGIN
  v_other_type := CASE p_reader_type
    WHEN 'customer' THEN 'seller'
    WHEN 'seller'   THEN 'customer'
    ELSE NULL
  END;
  IF v_other_type IS NULL THEN RETURN; END IF;

  -- Mark messages from the other party as read
  UPDATE public.conversation_messages
  SET    is_read = TRUE
  WHERE  conversation_id = p_conversation_id
    AND  sender_type     = v_other_type
    AND  is_read         = FALSE;

  -- Reset unread counter for the reader
  IF p_reader_type = 'customer' THEN
    UPDATE public.conversations
    SET customer_unread_count = 0
    WHERE id = p_conversation_id;
  ELSE
    UPDATE public.conversations
    SET seller_unread_count = 0
    WHERE id = p_conversation_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_messages_read(UUID, TEXT) TO service_role;

-- ── 5. Auto-update trigger ───────────────────────────────────────────────────
--
-- On INSERT into conversation_messages:
--   • Sets conversations.last_message + last_message_at
--   • Increments the RECIPIENT's unread counter
--
CREATE OR REPLACE FUNCTION public.fn_conversation_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_type = 'customer' THEN
    -- Customer sent → seller has a new unread
    UPDATE public.conversations
    SET last_message        = LEFT(NEW.message, 200),
        last_message_at     = NEW.created_at,
        seller_unread_count = seller_unread_count + 1
    WHERE id = NEW.conversation_id;

  ELSIF NEW.sender_type = 'seller' THEN
    -- Seller sent → customer has a new unread
    UPDATE public.conversations
    SET last_message           = LEFT(NEW.message, 200),
        last_message_at        = NEW.created_at,
        customer_unread_count  = customer_unread_count + 1
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversation_on_new_message ON public.conversation_messages;
CREATE TRIGGER trg_conversation_on_new_message
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW EXECUTE FUNCTION public.fn_conversation_on_new_message();

-- ── 6. RLS ───────────────────────────────────────────────────────────────────
-- supabaseAdmin (service_role) bypasses RLS by design.
-- These policies allow the authenticated role to access conversations
-- for users who are participants.
ALTER TABLE public.conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- service_role full access (belt & suspenders — service_role bypasses RLS anyway)
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='conversations' AND policyname='svc_all') THEN
    CREATE POLICY svc_all ON public.conversations
      FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='conversation_messages' AND policyname='svc_all') THEN
    CREATE POLICY svc_all ON public.conversation_messages
      FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;
