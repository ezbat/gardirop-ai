-- 046: Guest checkout support + banner/hero support
--
-- A) Add guest_email to orders (allows guest checkout without user_id)
-- B) Add banner_url to sellers (hero banner for storefront)
-- C) Add banner_url to storefront_settings (customizable hero)
-- D) Make orders.user_id nullable (guests don't have accounts)

-- ── A) Guest checkout ────────────────────────────────────────────────────────

-- Allow guest orders by making user_id nullable
ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL;

-- Add guest_email for guest order identification
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- Index for looking up guest orders by email
CREATE INDEX IF NOT EXISTS idx_orders_guest_email
  ON public.orders (guest_email)
  WHERE guest_email IS NOT NULL;

-- ── B) Banner URL on sellers ─────────────────────────────────────────────────

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- ── C) Banner URL on storefront_settings ─────────────────────────────────────

-- storefront_settings was created in 045 without public. prefix;
-- also guard against 045 not having run yet
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storefront_settings') THEN
    ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS banner_url TEXT;
  END IF;
END $$;

-- ── D) RLS: allow guest order access via stripe_checkout_session_id ──────────
-- (Service role bypasses RLS, so this is for completeness if anon client is ever used)
