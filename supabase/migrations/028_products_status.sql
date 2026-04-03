-- ============================================================
-- Migration 028: Add status column to products (idempotent)
-- Adds TEXT status column ('active'|'inactive'|'hidden') if
-- the products table doesn't already have it.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'products'
      AND column_name  = 'status'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive', 'hidden'));

    -- Back-fill: if is_active boolean column exists, derive status from it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'products'
        AND column_name  = 'is_active'
    ) THEN
      UPDATE public.products
        SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END;
    END IF;

  END IF;
END $$;

-- Index for status filtering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'products'
      AND indexname  = 'idx_products_status'
  ) THEN
    CREATE INDEX idx_products_status ON public.products(status);
  END IF;
END $$;
