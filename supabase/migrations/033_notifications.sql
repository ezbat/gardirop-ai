-- ─── 033_notifications.sql ───────────────────────────────────────────────────
-- Production-grade notification system for customers, sellers, and admins.
-- Drops and recreates the notifications table to replace the old incompatible
-- schema (old schema had: user_id, type, message, image_url — no recipient_type).
-- Safe to run idempotently: old table had no real data (code was broken).
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old indexes first (they may reference old columns)
DROP INDEX IF EXISTS public.idx_notifications_type_created;
DROP INDEX IF EXISTS public.idx_notifications_customer;
DROP INDEX IF EXISTS public.idx_notifications_seller;
DROP INDEX IF EXISTS public.idx_notifications_admin;

-- Drop old trigger (must go before dropping the table)
DROP TRIGGER IF EXISTS notifications_set_updated_at ON public.notifications;

-- Drop the old table entirely (incompatible schema, no real data)
DROP TABLE IF EXISTS public.notifications;

-- ── New schema ────────────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  user_id        text        NULL,         -- customer target (NextAuth user id)
  seller_id      uuid        NULL,         -- seller target  (sellers.id)
  admin_scope    boolean     NOT NULL DEFAULT false,  -- admin target flag
  recipient_type text        NOT NULL CHECK (recipient_type IN ('customer','seller','admin')),
  type           text        NOT NULL,
  title          text        NOT NULL,
  body           text        NOT NULL,
  link           text        NULL,
  is_read        boolean     NOT NULL DEFAULT false,
  read_at        timestamptz NULL,
  metadata       jsonb       NOT NULL DEFAULT '{}'::jsonb
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_notifications_type_created
  ON public.notifications (recipient_type, created_at DESC);

CREATE INDEX idx_notifications_customer
  ON public.notifications (user_id, is_read, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_notifications_seller
  ON public.notifications (seller_id, is_read, created_at DESC)
  WHERE seller_id IS NOT NULL;

CREATE INDEX idx_notifications_admin
  ON public.notifications (admin_scope, is_read, created_at DESC)
  WHERE admin_scope = true;

-- ── Auto-update updated_at ────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
  ) THEN
    CREATE FUNCTION public.set_updated_at()
    RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END $$;

CREATE TRIGGER notifications_set_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Service role bypass (used by all server routes via supabaseAdmin)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications'
      AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON public.notifications
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
