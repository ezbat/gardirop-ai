-- Order State Machine Migration
-- Adds state machine columns and validation logic to enforce proper order state transitions

-- Add state machine columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS state VARCHAR(50) DEFAULT 'CREATED',
ADD COLUMN IF NOT EXISTS state_history JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS escrow_release_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS previous_state VARCHAR(50);

-- Create ENUM type for valid order states
DO $$ BEGIN
  CREATE TYPE order_state AS ENUM (
    'CREATED',           -- Order initialized
    'PAYMENT_PENDING',   -- Stripe checkout started
    'PAID',              -- Payment successful (escrow held)
    'SHIPPED',           -- Seller shipped product
    'DELIVERED',         -- Carrier confirmed delivery
    'RETURN_REQUESTED',  -- Customer requested return
    'RETURN_APPROVED',   -- Return approved
    'DISPUTE_OPENED',    -- Dispute between buyer/seller
    'COMPLETED',         -- Order finalized, seller paid
    'REFUNDED',          -- Money returned to customer
    'CANCELLED'          -- Order cancelled before payment
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create state transition rules table
CREATE TABLE IF NOT EXISTS order_state_transitions (
  from_state VARCHAR(50) NOT NULL,
  to_state VARCHAR(50) NOT NULL,
  requires_condition TEXT,
  is_automatic BOOLEAN DEFAULT false,
  PRIMARY KEY (from_state, to_state)
);

-- Insert allowed state transitions
INSERT INTO order_state_transitions (from_state, to_state, requires_condition, is_automatic)
VALUES
  ('CREATED', 'PAYMENT_PENDING', NULL, true),
  ('PAYMENT_PENDING', 'PAID', 'payment_intent.succeeded', true),
  ('PAYMENT_PENDING', 'CANCELLED', 'session.expired OR user action', false),
  ('PAID', 'SHIPPED', 'seller action + tracking_number', false),
  ('PAID', 'CANCELLED', 'admin refund', false),
  ('SHIPPED', 'DELIVERED', 'carrier webhook OR seller confirmation', true),
  ('DELIVERED', 'COMPLETED', 'escrow_release_at <= NOW()', true),
  ('DELIVERED', 'RETURN_REQUESTED', 'customer action', false),
  ('RETURN_REQUESTED', 'RETURN_APPROVED', 'seller/admin approval', false),
  ('RETURN_REQUESTED', 'DISPUTE_OPENED', 'seller rejection', false),
  ('RETURN_APPROVED', 'REFUNDED', 'Stripe refund.create', true),
  ('DISPUTE_OPENED', 'REFUNDED', 'admin decision', false),
  ('DISPUTE_OPENED', 'COMPLETED', 'admin decision', false)
ON CONFLICT (from_state, to_state) DO NOTHING;

-- Validation function to enforce state transitions
CREATE OR REPLACE FUNCTION validate_order_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip validation if state hasn't changed
  IF OLD.state IS NULL OR OLD.state = NEW.state THEN
    RETURN NEW;
  END IF;

  -- Check if transition is allowed
  IF NOT EXISTS (
    SELECT 1 FROM order_state_transitions
    WHERE from_state = OLD.state
    AND to_state = NEW.state
  ) THEN
    RAISE EXCEPTION 'Invalid state transition: % → %', OLD.state, NEW.state;
  END IF;

  -- Log state change to history
  NEW.state_history = COALESCE(OLD.state_history, '[]'::jsonb) ||
    jsonb_build_object(
      'from', OLD.state,
      'to', NEW.state,
      'at', NOW(),
      'by', current_setting('request.jwt.claims', true)::jsonb->>'sub'
    );

  NEW.previous_state = OLD.state;
  NEW.updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce state machine
DROP TRIGGER IF EXISTS enforce_order_state_machine ON orders;
CREATE TRIGGER enforce_order_state_machine
BEFORE UPDATE OF state ON orders
FOR EACH ROW
EXECUTE FUNCTION validate_order_state_transition();

-- Create index for state queries
CREATE INDEX IF NOT EXISTS idx_orders_state ON orders(state);
CREATE INDEX IF NOT EXISTS idx_orders_escrow_release ON orders(escrow_release_at) WHERE state = 'DELIVERED';

-- Migrate existing orders to CREATED state if they don't have a state
UPDATE orders SET state = 'CREATED' WHERE state IS NULL;
