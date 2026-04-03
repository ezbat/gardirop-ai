-- ============================================================
-- Migration 032: Hierarchical inventory threshold system
--
-- Creates three-level threshold configuration:
--   1) products.low_stock_threshold  (per-product override)
--   2) category_stock_configs        (per-category override)
--   3) global_config key             (global default = 5)
--
-- Resolution order (highest priority first):
--   product.low_stock_threshold  → category_stock_configs → global_config
-- ============================================================

-- ── 1. global_config ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.global_config (
  key         text        PRIMARY KEY,
  value       jsonb       NOT NULL,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed default low-stock threshold (no-op if already present)
INSERT INTO public.global_config (key, value, description)
VALUES (
  'inventory.default_low_stock_threshold',
  '{"threshold": 5}',
  'Default low-stock alert threshold (units). Applied to all products unless overridden at category or product level.'
)
ON CONFLICT (key) DO NOTHING;

-- ── 2. category_stock_configs ─────────────────────────────────────────────────
-- Categories in this project are free-text slugs stored directly on products.category
CREATE TABLE IF NOT EXISTS public.category_stock_configs (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_slug       text        NOT NULL,
  low_stock_threshold integer     NOT NULL CHECK (low_stock_threshold >= 0),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_category_stock_slug UNIQUE (category_slug)
);

-- ── 3. products.low_stock_threshold column ────────────────────────────────────
-- Nullable: NULL means "inherit from category / global"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'products'
      AND column_name  = 'low_stock_threshold'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN low_stock_threshold integer NULL
      CONSTRAINT chk_products_low_stock_threshold CHECK (low_stock_threshold >= 0);
  END IF;
END $$;

-- ── 4. Indexes ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_global_config_key') THEN
    CREATE INDEX idx_global_config_key ON public.global_config (key);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_category_stock_configs_slug') THEN
    CREATE INDEX idx_category_stock_configs_slug ON public.category_stock_configs (category_slug);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_products_low_stock_threshold_notnull') THEN
    CREATE INDEX idx_products_low_stock_threshold_notnull
      ON public.products (low_stock_threshold)
      WHERE low_stock_threshold IS NOT NULL;
  END IF;
END $$;

-- ── 5. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.global_config            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_stock_configs   ENABLE ROW LEVEL SECURITY;

-- Service-role bypass (admin API uses supabaseAdmin which is service_role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'global_config' AND policyname = 'service_role_all_global_config'
  ) THEN
    CREATE POLICY service_role_all_global_config
      ON public.global_config FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'category_stock_configs' AND policyname = 'service_role_all_category_stock_configs'
  ) THEN
    CREATE POLICY service_role_all_category_stock_configs
      ON public.category_stock_configs FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;
