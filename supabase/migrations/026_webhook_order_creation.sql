-- ===================================================================
-- Migration 026: Webhook-First Order Creation
-- ===================================================================
-- This migration supports the new webhook-first order creation flow
-- where orders are created ONLY after successful Stripe payment
-- ===================================================================

-- 1. Allow NULL → PAID state transition for webhook-created orders
-- This enables orders to be created directly in PAID state from webhooks
INSERT INTO order_state_transitions (from_state, to_state, requires_condition, is_automatic)
VALUES ('NULL', 'PAID', 'webhook payment confirmation', true)
ON CONFLICT (from_state, to_state) DO NOTHING;

-- 2. Create failed_checkouts table for error tracking
-- Stores Stripe sessions where payment succeeded but order creation failed
CREATE TABLE IF NOT EXISTS failed_checkouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_session_id VARCHAR UNIQUE NOT NULL,
  error_message TEXT,
  session_data JSONB,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Add index for fast order lookup by Stripe session ID
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session
ON orders(stripe_checkout_session_id);

-- 4. Add comments for documentation
COMMENT ON TABLE failed_checkouts IS
'Tracks Stripe checkout sessions where payment succeeded but order creation failed in webhook. Used for manual recovery and debugging.';

COMMENT ON COLUMN failed_checkouts.stripe_session_id IS
'Unique Stripe checkout session ID';

COMMENT ON COLUMN failed_checkouts.session_data IS
'Full Stripe session object stored as JSONB for debugging and recovery';

COMMENT ON COLUMN failed_checkouts.retry_count IS
'Number of times this failed checkout has been retried manually';

-- 5. Create a view to monitor failed checkouts
CREATE OR REPLACE VIEW failed_checkouts_summary AS
SELECT
  id,
  stripe_session_id,
  error_message,
  retry_count,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS hours_since_failure,
  session_data->>'payment_intent' AS payment_intent_id,
  session_data->>'customer_email' AS customer_email,
  (session_data->'metadata'->>'total')::DECIMAL AS total_amount
FROM failed_checkouts
ORDER BY created_at DESC;

COMMENT ON VIEW failed_checkouts_summary IS
'Summary view of failed checkouts with extracted key information for quick review';

-- 6. Grant permissions
GRANT SELECT ON failed_checkouts_summary TO authenticated;

-- 7. Verification query to check migration success
-- Run this after migration to verify:
-- SELECT * FROM order_state_transitions WHERE from_state = 'NULL' AND to_state = 'PAID';
-- SELECT COUNT(*) FROM failed_checkouts;
