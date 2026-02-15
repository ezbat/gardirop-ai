-- Stripe Connect Integration Migration
-- Adds Stripe Connect account fields for multi-seller marketplace payments

-- Add Stripe Connect fields to sellers table
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_verification_status VARCHAR,
ADD COLUMN IF NOT EXISTS stripe_requirements_currently_due TEXT[],
ADD COLUMN IF NOT EXISTS stripe_onboarding_link VARCHAR,
ADD COLUMN IF NOT EXISTS stripe_onboarding_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_account_type VARCHAR DEFAULT 'express'; -- 'express' or 'standard'

-- Add payout tracking fields to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS seller_payout_status VARCHAR DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS seller_payout_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS platform_commission DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR,
ADD COLUMN IF NOT EXISTS payout_completed_at TIMESTAMP;

-- Add Stripe payment fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sellers_stripe_account ON sellers(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_sellers_onboarding_status ON sellers(stripe_onboarding_complete, stripe_charges_enabled);
CREATE INDEX IF NOT EXISTS idx_order_items_payout_status ON order_items(seller_payout_status);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_pending ON order_items(seller_id, seller_payout_status) WHERE seller_payout_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_checkout_session_id);

-- Create a table to track all Stripe transfers for audit purposes
CREATE TABLE IF NOT EXISTS stripe_transfers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transfer_id VARCHAR NOT NULL UNIQUE, -- Stripe transfer ID
  order_id UUID NOT NULL REFERENCES orders(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, reversed
  stripe_account_id VARCHAR NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_stripe_transfers_order ON stripe_transfers(order_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transfers_seller ON stripe_transfers(seller_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transfers_status ON stripe_transfers(status);

-- Create seller_transactions table for detailed financial tracking
CREATE TABLE IF NOT EXISTS seller_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id),
  order_id UUID REFERENCES orders(id),
  type VARCHAR(50) NOT NULL, -- 'sale', 'refund', 'payout', 'commission'
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2),
  description TEXT,
  stripe_transfer_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_seller_transactions_seller ON seller_transactions(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_order ON seller_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_type ON seller_transactions(type);

-- Update seller_balances table with new fields if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_balances') THEN
    ALTER TABLE seller_balances
    ADD COLUMN IF NOT EXISTS pending_balance DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_withdrawn DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_payout_at TIMESTAMP;

    -- Create index for balance queries
    CREATE INDEX IF NOT EXISTS idx_seller_balances_pending ON seller_balances(seller_id, pending_balance) WHERE pending_balance > 0;
  END IF;
END $$;

-- Create function to check if seller can receive payments
CREATE OR REPLACE FUNCTION can_seller_receive_payments(p_seller_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_seller RECORD;
BEGIN
  SELECT
    stripe_account_id,
    stripe_onboarding_complete,
    stripe_charges_enabled,
    stripe_payouts_enabled,
    status
  INTO v_seller
  FROM sellers
  WHERE id = p_seller_id;

  RETURN (
    v_seller.stripe_account_id IS NOT NULL AND
    v_seller.stripe_onboarding_complete = true AND
    v_seller.stripe_charges_enabled = true AND
    v_seller.stripe_payouts_enabled = true AND
    v_seller.status = 'approved'
  );
END;
$$ LANGUAGE plpgsql;

-- Create view for seller payment readiness
CREATE OR REPLACE VIEW seller_payment_status AS
SELECT
  s.id,
  s.user_id,
  s.shop_name,
  s.status as seller_status,
  s.stripe_account_id,
  s.stripe_onboarding_complete,
  s.stripe_charges_enabled,
  s.stripe_payouts_enabled,
  s.stripe_verification_status,
  s.stripe_details_submitted,
  CASE
    WHEN s.stripe_account_id IS NULL THEN 'not_started'
    WHEN s.stripe_onboarding_complete = false THEN 'onboarding_incomplete'
    WHEN s.stripe_charges_enabled = false THEN 'charges_disabled'
    WHEN s.stripe_payouts_enabled = false THEN 'payouts_disabled'
    WHEN s.status != 'approved' THEN 'seller_not_approved'
    ELSE 'ready'
  END as payment_readiness_status,
  can_seller_receive_payments(s.id) as can_receive_payments
FROM sellers s;

-- Add comment documentation
COMMENT ON TABLE stripe_transfers IS 'Audit log of all Stripe transfers to sellers';
COMMENT ON TABLE seller_transactions IS 'Detailed financial transaction history for sellers';
COMMENT ON COLUMN sellers.stripe_account_id IS 'Stripe Connect account ID for this seller';
COMMENT ON COLUMN sellers.stripe_onboarding_complete IS 'Whether seller has completed Stripe onboarding';
COMMENT ON COLUMN sellers.stripe_charges_enabled IS 'Whether Stripe account can accept charges';
COMMENT ON COLUMN sellers.stripe_payouts_enabled IS 'Whether Stripe account can receive payouts';
COMMENT ON COLUMN order_items.seller_payout_status IS 'Status of seller payout: pending, processing, completed, failed';
COMMENT ON COLUMN order_items.seller_payout_amount IS 'Amount to be paid to seller after platform commission';
COMMENT ON COLUMN order_items.platform_commission IS 'Platform commission amount';
