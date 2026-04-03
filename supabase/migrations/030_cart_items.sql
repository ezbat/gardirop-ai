-- ============================================================
-- Migration 030: cart_items  (server-side persistent cart)
-- One row per (user_id, product_id, selected_size).
-- NULL selected_size is treated as a distinct value so a plain
-- T-shirt and a sized T-shirt can coexist in the same cart.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cart_items (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT         NOT NULL,          -- NextAuth user id (string)
  product_id    UUID         NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  selected_size TEXT,                           -- NULL = no size variant
  quantity      INT          NOT NULL DEFAULT 1
                             CHECK (quantity >= 1 AND quantity <= 999),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Unique entry per (user, product, size) — NULLs are treated as equal ───────
DO $$
BEGIN
  -- NULLS NOT DISTINCT requires PG 15+; Supabase ships PG 15.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cart_item_unique' AND conrelid = 'public.cart_items'::regclass
  ) THEN
    ALTER TABLE public.cart_items
      ADD CONSTRAINT cart_item_unique
      UNIQUE NULLS NOT DISTINCT (user_id, product_id, selected_size);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Fallback for older PG: use two partial unique indexes instead
  RAISE NOTICE 'UNIQUE NULLS NOT DISTINCT not supported, using partial indexes: %', SQLERRM;
END $$;

-- Partial unique indexes as fallback (safe to create even when constraint exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='cart_items' AND indexname='idx_cart_item_no_size') THEN
    CREATE UNIQUE INDEX idx_cart_item_no_size
      ON public.cart_items(user_id, product_id)
      WHERE selected_size IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='cart_items' AND indexname='idx_cart_item_with_size') THEN
    CREATE UNIQUE INDEX idx_cart_item_with_size
      ON public.cart_items(user_id, product_id, selected_size)
      WHERE selected_size IS NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='cart_items' AND indexname='idx_cart_user_id') THEN
    CREATE INDEX idx_cart_user_id ON public.cart_items(user_id);
  END IF;
END $$;

-- ── Auto-update updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_cart_items_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_cart_items_updated_at();

-- ── RLS: each user sees only their own cart ───────────────────────────────────
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cart_own_all"         ON public.cart_items;
DROP POLICY IF EXISTS "cart_service_role_all" ON public.cart_items;

-- Authenticated users can fully manage their own rows
CREATE POLICY "cart_own_all"
  ON public.cart_items
  USING     (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Service role (used by API routes via supabaseAdmin) has full access
CREATE POLICY "cart_service_role_all"
  ON public.cart_items TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.cart_items IS
  'Server-side persistent cart. One row per (user_id, product_id, selected_size). Merged from localStorage on login.';
