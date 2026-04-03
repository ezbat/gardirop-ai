-- ============================================================
-- Migration 027: seller_applications  (idempotent — re-runnable)
-- Tracks multi-step seller onboarding applications.
-- Status lifecycle:
--   submitted → under_review → approved | rejected | needs_info
--
-- Safe to run on both fresh DBs and DBs that already have an
-- older seller_applications table (adds missing columns).
-- ============================================================

-- ── 1. Create table if it doesn't exist yet ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seller_applications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status     VARCHAR(32) NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add created_at / updated_at if old table used applied_at instead
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='created_at') THEN
    ALTER TABLE public.seller_applications ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    -- back-fill from applied_at if that column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='applied_at') THEN
      UPDATE public.seller_applications SET created_at = applied_at WHERE applied_at IS NOT NULL;
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='updated_at') THEN
    ALTER TABLE public.seller_applications ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- ── 2. Add every column that may be missing (idempotent) ─────────────────────
DO $$
BEGIN
  -- status CHECK constraint (recreate safely)
  ALTER TABLE public.seller_applications
    DROP CONSTRAINT IF EXISTS seller_app_status_chk;
  ALTER TABLE public.seller_applications
    ADD CONSTRAINT seller_app_status_chk
    CHECK (status IN ('submitted','under_review','approved','rejected','needs_info'));

  -- Step 1: Contact
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='full_name') THEN
    ALTER TABLE public.seller_applications ADD COLUMN full_name VARCHAR(200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='email') THEN
    ALTER TABLE public.seller_applications ADD COLUMN email VARCHAR(300);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='phone') THEN
    ALTER TABLE public.seller_applications ADD COLUMN phone VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='country') THEN
    ALTER TABLE public.seller_applications ADD COLUMN country VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='applicant_type') THEN
    ALTER TABLE public.seller_applications ADD COLUMN applicant_type VARCHAR(16);
  END IF;

  -- Step 2a: Individual identity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='legal_full_name') THEN
    ALTER TABLE public.seller_applications ADD COLUMN legal_full_name VARCHAR(200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='date_of_birth') THEN
    ALTER TABLE public.seller_applications ADD COLUMN date_of_birth DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='residence_country') THEN
    ALTER TABLE public.seller_applications ADD COLUMN residence_country VARCHAR(100);
  END IF;

  -- Step 2b: Company identity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='company_name') THEN
    ALTER TABLE public.seller_applications ADD COLUMN company_name VARCHAR(300);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='company_reg_number') THEN
    ALTER TABLE public.seller_applications ADD COLUMN company_reg_number VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='vat_id') THEN
    ALTER TABLE public.seller_applications ADD COLUMN vat_id VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='company_address') THEN
    ALTER TABLE public.seller_applications ADD COLUMN company_address JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='business_type') THEN
    ALTER TABLE public.seller_applications ADD COLUMN business_type VARCHAR(100);
  END IF;

  -- Step 3: Store profile
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='store_name') THEN
    ALTER TABLE public.seller_applications ADD COLUMN store_name VARCHAR(200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='brand_name') THEN
    ALTER TABLE public.seller_applications ADD COLUMN brand_name VARCHAR(200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='product_categories') THEN
    ALTER TABLE public.seller_applications ADD COLUMN product_categories TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='store_description') THEN
    ALTER TABLE public.seller_applications ADD COLUMN store_description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='website_url') THEN
    ALTER TABLE public.seller_applications ADD COLUMN website_url VARCHAR(500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='social_links') THEN
    ALTER TABLE public.seller_applications ADD COLUMN social_links JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='estimated_monthly_orders') THEN
    ALTER TABLE public.seller_applications ADD COLUMN estimated_monthly_orders VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='avg_order_value') THEN
    ALTER TABLE public.seller_applications ADD COLUMN avg_order_value VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='product_origin') THEN
    ALTER TABLE public.seller_applications ADD COLUMN product_origin VARCHAR(32);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='product_origin_detail') THEN
    ALTER TABLE public.seller_applications ADD COLUMN product_origin_detail VARCHAR(300);
  END IF;

  -- Step 4: Operations
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='return_address') THEN
    ALTER TABLE public.seller_applications ADD COLUMN return_address JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='support_email') THEN
    ALTER TABLE public.seller_applications ADD COLUMN support_email VARCHAR(300);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='shipping_countries') THEN
    ALTER TABLE public.seller_applications ADD COLUMN shipping_countries TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='fulfillment_model') THEN
    ALTER TABLE public.seller_applications ADD COLUMN fulfillment_model VARCHAR(32);
  END IF;

  -- Declarations
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='decl_accurate_info') THEN
    ALTER TABLE public.seller_applications ADD COLUMN decl_accurate_info BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='decl_terms_agreed') THEN
    ALTER TABLE public.seller_applications ADD COLUMN decl_terms_agreed BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='decl_verification_consent') THEN
    ALTER TABLE public.seller_applications ADD COLUMN decl_verification_consent BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='decl_product_compliance') THEN
    ALTER TABLE public.seller_applications ADD COLUMN decl_product_compliance BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='decl_privacy_acknowledged') THEN
    ALTER TABLE public.seller_applications ADD COLUMN decl_privacy_acknowledged BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='decl_is_trader') THEN
    ALTER TABLE public.seller_applications ADD COLUMN decl_is_trader BOOLEAN DEFAULT FALSE;
  END IF;

  -- Admin / review
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='reviewer_notes') THEN
    ALTER TABLE public.seller_applications ADD COLUMN reviewer_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='reviewed_by') THEN
    ALTER TABLE public.seller_applications ADD COLUMN reviewed_by UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='reviewed_at') THEN
    ALTER TABLE public.seller_applications ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='rejection_reason') THEN
    ALTER TABLE public.seller_applications ADD COLUMN rejection_reason TEXT;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'seller_applications column migration warning: %', SQLERRM;
END $$;

-- ── 3. Indexes — all wrapped in existence checks ─────────────────────────────
DO $$
BEGIN
  -- status
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='seller_applications' AND indexname='idx_seller_app_status') THEN
    CREATE INDEX idx_seller_app_status ON public.seller_applications(status);
  END IF;

  -- user_id
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='seller_applications' AND indexname='idx_seller_app_uid') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='user_id') THEN
      CREATE INDEX idx_seller_app_uid ON public.seller_applications(user_id) WHERE user_id IS NOT NULL;
    END IF;
  END IF;

  -- created_at
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='seller_applications' AND indexname='idx_seller_app_created') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='created_at') THEN
      CREATE INDEX idx_seller_app_created ON public.seller_applications(created_at DESC);
    END IF;
  END IF;

  -- email
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='seller_applications' AND indexname='idx_seller_app_email') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_applications' AND column_name='email') THEN
      CREATE INDEX idx_seller_app_email ON public.seller_applications(email);
    END IF;
  END IF;
END $$;

-- ── 4. Trigger ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_seller_app_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_seller_app_updated_at ON public.seller_applications;
CREATE TRIGGER trg_seller_app_updated_at
  BEFORE UPDATE ON public.seller_applications
  FOR EACH ROW EXECUTE FUNCTION public.fn_seller_app_updated_at();

-- ── 5. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_app_insert_own"       ON public.seller_applications;
DROP POLICY IF EXISTS "seller_app_read_own"         ON public.seller_applications;
DROP POLICY IF EXISTS "seller_app_service_role_all" ON public.seller_applications;

CREATE POLICY "seller_app_insert_own"
  ON public.seller_applications FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id::text = auth.uid()::text);

CREATE POLICY "seller_app_read_own"
  ON public.seller_applications FOR SELECT TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "seller_app_service_role_all"
  ON public.seller_applications TO service_role
  USING (true) WITH CHECK (true);

-- ── 6. Comments ───────────────────────────────────────────────────────────────
COMMENT ON TABLE public.seller_applications IS
  'Seller onboarding applications. Review pipeline: submitted → under_review → approved / rejected / needs_info';
