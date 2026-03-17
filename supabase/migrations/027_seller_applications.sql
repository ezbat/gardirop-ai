-- ============================================================
-- Migration 027: seller_applications
-- Tracks multi-step seller onboarding applications.
-- Status lifecycle:
--   submitted → under_review → approved | rejected | needs_info
-- ============================================================

CREATE TABLE IF NOT EXISTS public.seller_applications (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,

  status                   VARCHAR(32)  NOT NULL DEFAULT 'submitted'
    CONSTRAINT seller_app_status_chk
    CHECK (status IN ('submitted','under_review','approved','rejected','needs_info')),

  -- ── Step 1: Contact ───────────────────────────────────────────────────
  full_name                VARCHAR(200) NOT NULL,
  email                    VARCHAR(300) NOT NULL,
  phone                    VARCHAR(50),
  country                  VARCHAR(100) NOT NULL,
  applicant_type           VARCHAR(16)  NOT NULL
    CONSTRAINT seller_app_type_chk
    CHECK (applicant_type IN ('individual','company')),

  -- ── Step 2a: Individual identity ─────────────────────────────────────
  -- Collected to identify the natural person behind the seller account.
  -- Required for payment/payout onboarding and regulatory traceability.
  legal_full_name          VARCHAR(200),
  date_of_birth            DATE,           -- optional at application; may be requested by payout provider
  residence_country        VARCHAR(100),

  -- ── Step 2b: Company identity ────────────────────────────────────────
  -- Business details needed to identify registered traders.
  -- Required for compliance and payout processing.
  company_name             VARCHAR(300),
  company_reg_number       VARCHAR(100),   -- optional; strengthens identity verification
  vat_id                   VARCHAR(100),   -- optional at application stage
  company_address          JSONB,          -- { line1, line2?, city, postal_code, country }
  business_type            VARCHAR(100),

  -- ── Step 3: Store / brand profile ────────────────────────────────────
  store_name               VARCHAR(200) NOT NULL,
  brand_name               VARCHAR(200),
  product_categories       TEXT[]       DEFAULT '{}',
  store_description        TEXT,
  website_url              VARCHAR(500),
  social_links             JSONB,          -- { instagram?, tiktok?, youtube? }
  estimated_monthly_orders VARCHAR(50),
  avg_order_value          VARCHAR(50),
  product_origin           VARCHAR(32)
    CONSTRAINT seller_app_origin_chk
    CHECK (product_origin IN ('own_brand','resale','handmade','other')),
  product_origin_detail    VARCHAR(300),

  -- ── Step 4: Operations & compliance ──────────────────────────────────
  return_address           JSONB,          -- { line1, city, postal_code, country }
  support_email            VARCHAR(300),
  shipping_countries       TEXT[]       DEFAULT '{}',
  fulfillment_model        VARCHAR(32)
    CONSTRAINT seller_app_fulfillment_chk
    CHECK (fulfillment_model IN ('self','warehouse','dropshipping')),

  -- ── Declarations (all required to submit) ────────────────────────────
  decl_accurate_info          BOOLEAN NOT NULL DEFAULT FALSE,
  decl_terms_agreed           BOOLEAN NOT NULL DEFAULT FALSE,
  decl_verification_consent   BOOLEAN NOT NULL DEFAULT FALSE,
  decl_product_compliance     BOOLEAN NOT NULL DEFAULT FALSE,
  decl_privacy_acknowledged   BOOLEAN NOT NULL DEFAULT FALSE,
  decl_is_trader              BOOLEAN          DEFAULT FALSE, -- optional trader self-declaration

  -- ── Admin / review ───────────────────────────────────────────────────
  reviewer_notes           TEXT,
  reviewed_by              UUID,
  reviewed_at              TIMESTAMPTZ,
  rejection_reason         TEXT,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_seller_app_status    ON public.seller_applications(status);
CREATE INDEX IF NOT EXISTS idx_seller_app_email     ON public.seller_applications(email);
CREATE INDEX IF NOT EXISTS idx_seller_app_uid       ON public.seller_applications(user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seller_app_created   ON public.seller_applications(created_at DESC);

-- ── Auto-update timestamp ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_seller_app_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_seller_app_updated_at ON public.seller_applications;
CREATE TRIGGER trg_seller_app_updated_at
  BEFORE UPDATE ON public.seller_applications
  FOR EACH ROW EXECUTE FUNCTION public.fn_seller_app_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;

-- Authenticated users can submit an application (guest submissions handled via service_role API)
CREATE POLICY "seller_app_insert_own"
  ON public.seller_applications FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Users can view their own submitted application
CREATE POLICY "seller_app_read_own"
  ON public.seller_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role (admin backend) has unrestricted access
CREATE POLICY "seller_app_service_role_all"
  ON public.seller_applications TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.seller_applications IS
  'Seller onboarding applications. Review pipeline: submitted → under_review → approved / rejected / needs_info';
COMMENT ON COLUMN public.seller_applications.company_address IS
  'JSONB: { line1 text, line2 text?, city text, postal_code text, country text }';
COMMENT ON COLUMN public.seller_applications.return_address IS
  'JSONB: { line1 text, city text, postal_code text?, country text }';
COMMENT ON COLUMN public.seller_applications.social_links IS
  'JSONB: { instagram text?, tiktok text?, youtube text? }';
