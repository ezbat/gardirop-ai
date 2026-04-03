-- 047: Subscription / plan infrastructure for SaaS productization
--
-- Adds plan_id to sellers and a subscriptions table for Stripe Billing.
-- Starter plan is the default (free, 5% commission).

-- ── A) Add plan_id to sellers ────────────────────────────────────────────────

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'starter';

-- ── B) Subscriptions table (Stripe Billing mirror) ──────────────────────────

-- Drop if exists from a previous failed run (had seller_id UUID instead of TEXT)
DROP TABLE IF EXISTS public.subscriptions CASCADE;

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_id TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'active',
    -- active, past_due, canceled, trialing, incomplete
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  billing_interval TEXT DEFAULT 'monthly',
    -- monthly, yearly
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_seller_id
  ON public.subscriptions (seller_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust_id
  ON public.subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ── C) Update commission_rate default ────────────────────────────────────────
-- Starter plan = 5% commission (was previously set per seller)
-- The actual rate is now derived from plan_id in application code,
-- but we keep the column for override/legacy compatibility.

-- ── D) RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_full_access" ON public.subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- Seller can read own subscription
-- Explicit ::text casts everywhere: sellers.id and sellers.user_id are TEXT, auth.uid() is UUID
CREATE POLICY "seller_read_own" ON public.subscriptions
  FOR SELECT USING (
    seller_id::text IN (
      SELECT id::text FROM public.sellers WHERE user_id::text = (auth.uid())::text
    )
  );

-- ── E) Verified seller flag (ensure it exists) ──────────────────────────────

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
