-- ═══════════════════════════════════════════════════════════
-- WEARO Production Hardening Phase 2
-- Atomic operations, persistent idempotency, risk engine,
-- audit logging, anti-fraud infrastructure
-- ═══════════════════════════════════════════════════════════

-- ─── FIX: Add performed_by to inventory_movements ────────
-- Code uses performed_by but migration 002 only had seller_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'performed_by'
  ) THEN
    ALTER TABLE inventory_movements ADD COLUMN performed_by TEXT;
  END IF;
END $$;

-- ─── FIX: Relax type constraint on inventory_movements ───
-- Code uses lowercase types but migration 002 enforced UPPERCASE
-- Drop and recreate with both forms accepted
DO $$
BEGIN
  ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_type_check;
  ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_type_check
    CHECK (type IN (
      'SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN', 'DAMAGED',
      'sale', 'restock', 'adjustment', 'return', 'damaged',
      'reservation', 'cancellation', 'transfer'
    ));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ─── Add idempotency_key to seller_transactions ──────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seller_transactions' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE seller_transactions ADD COLUMN idempotency_key TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_transactions_idempotency
      ON seller_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
  END IF;
END $$;

-- ─── Add CHECK constraint on products.stock_quantity ─────
-- Prevent negative stock at DB level
DO $$
BEGIN
  ALTER TABLE products ADD CONSTRAINT products_stock_non_negative
    CHECK (stock_quantity >= 0);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ═══════════════════════════════════════════════════════════
-- NEW TABLES
-- ═══════════════════════════════════════════════════════════

-- ─── WEBHOOK EVENTS (persistent idempotency) ─────────────
DROP TABLE IF EXISTS webhook_events CASCADE;
CREATE TABLE webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'stripe',
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  payload JSONB,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_expires ON webhook_events(expires_at) WHERE status != 'completed';

-- ─── AUDIT LOGS ──────────────────────────────────────────
DROP TABLE IF EXISTS audit_logs CASCADE;
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id TEXT,
  actor_type TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN ('user', 'seller', 'admin', 'system', 'webhook')),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('warning', 'error', 'critical');
CREATE INDEX IF NOT EXISTS idx_audit_logs_request ON audit_logs(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ─── RISK SCORES ─────────────────────────────────────────
DROP TABLE IF EXISTS risk_scores CASCADE;
CREATE TABLE risk_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'withdrawal', 'seller', 'user')),
  entity_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  level TEXT NOT NULL CHECK (level IN ('low', 'medium', 'high', 'critical')),
  factors JSONB NOT NULL DEFAULT '[]',
  action_taken TEXT NOT NULL CHECK (action_taken IN ('allow', 'flag', 'hold', 'block')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_scores_entity ON risk_scores(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_level ON risk_scores(level) WHERE level IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_risk_scores_action ON risk_scores(action_taken) WHERE action_taken IN ('flag', 'hold', 'block');
CREATE INDEX IF NOT EXISTS idx_risk_scores_created ON risk_scores(created_at);

-- ─── FRAUD SIGNALS ───────────────────────────────────────
DROP TABLE IF EXISTS fraud_signals CASCADE;
CREATE TABLE fraud_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'ip_velocity', 'fingerprint_cluster', 'ctr_anomaly', 'bot_pattern',
    'payment_velocity', 'coupon_abuse', 'account_takeover', 'manual_flag'
  )),
  ip_address TEXT,
  fingerprint TEXT,
  user_id TEXT,
  seller_id TEXT,
  campaign_id TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'investigated', 'dismissed', 'confirmed')),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_type ON fraud_signals(signal_type, created_at);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_ip ON fraud_signals(ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fraud_signals_severity ON fraud_signals(severity) WHERE severity IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_fraud_signals_status ON fraud_signals(status) WHERE status = 'active';

-- ─── BLOCKED IPS ─────────────────────────────────────────
DROP TABLE IF EXISTS blocked_ips CASCADE;
CREATE TABLE blocked_ips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_by TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires ON blocked_ips(expires_at) WHERE expires_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════
-- RLS ON NEW TABLES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

-- Service role bypass for all new tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['webhook_events', 'audit_logs', 'risk_scores', 'fraud_signals', 'blocked_ips'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON %I', tbl);
    EXECUTE format('CREATE POLICY "Service role full access" ON %I FOR ALL USING (true)', tbl);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- RPC FUNCTIONS — Atomic Operations with Row-Level Locking
-- ═══════════════════════════════════════════════════════════

-- ─── balance_deduct ──────────────────────────────────────
-- Atomically deduct from available_balance with idempotency
CREATE OR REPLACE FUNCTION balance_deduct(
  p_seller_id TEXT,
  p_amount DECIMAL,
  p_ref_type TEXT,
  p_ref_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_balance RECORD;
  v_existing RECORD;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM seller_transactions
    WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'duplicate', true,
        'transaction_id', v_existing.id
      );
    END IF;
  END IF;

  -- Lock the balance row
  SELECT * INTO v_balance FROM seller_balances
  WHERE seller_id = p_seller_id::UUID
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'SELLER_NOT_FOUND');
  END IF;

  IF v_balance.available_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_BALANCE',
      'available', v_balance.available_balance,
      'requested', p_amount
    );
  END IF;

  -- Deduct
  UPDATE seller_balances
  SET available_balance = available_balance - p_amount,
      total_withdrawn = total_withdrawn + p_amount
  WHERE seller_id = p_seller_id::UUID;

  -- Record transaction
  INSERT INTO seller_transactions (seller_id, type, amount, net_amount, status, description, idempotency_key)
  VALUES (p_seller_id::UUID, p_ref_type, p_amount, -p_amount, 'completed', p_description, p_idempotency_key);

  RETURN jsonb_build_object(
    'success', true,
    'new_available', v_balance.available_balance - p_amount,
    'deducted', p_amount
  );
END;
$$ LANGUAGE plpgsql;

-- ─── balance_add ─────────────────────────────────────────
-- Atomically add to available_balance or pending_balance
CREATE OR REPLACE FUNCTION balance_add(
  p_seller_id TEXT,
  p_amount DECIMAL,
  p_target TEXT DEFAULT 'available',  -- 'available' or 'pending'
  p_ref_type TEXT DEFAULT 'sale',
  p_description TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_balance RECORD;
  v_existing RECORD;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM seller_transactions
    WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'duplicate', true);
    END IF;
  END IF;

  -- Lock the balance row (or create if missing)
  SELECT * INTO v_balance FROM seller_balances
  WHERE seller_id = p_seller_id::UUID
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO seller_balances (seller_id, available_balance, pending_balance, total_withdrawn, total_sales)
    VALUES (p_seller_id::UUID, 0, 0, 0, 0);
    SELECT * INTO v_balance FROM seller_balances
    WHERE seller_id = p_seller_id::UUID
    FOR UPDATE;
  END IF;

  -- Add to target
  IF p_target = 'pending' THEN
    UPDATE seller_balances
    SET pending_balance = pending_balance + p_amount,
        total_sales = total_sales + p_amount
    WHERE seller_id = p_seller_id::UUID;
  ELSE
    UPDATE seller_balances
    SET available_balance = available_balance + p_amount,
        total_sales = total_sales + p_amount
    WHERE seller_id = p_seller_id::UUID;
  END IF;

  -- Record transaction
  INSERT INTO seller_transactions (seller_id, type, amount, net_amount, status, description, idempotency_key)
  VALUES (p_seller_id::UUID, p_ref_type, p_amount, p_amount, 'completed', p_description, p_idempotency_key);

  RETURN jsonb_build_object(
    'success', true,
    'added', p_amount,
    'target', p_target
  );
END;
$$ LANGUAGE plpgsql;

-- ─── balance_freeze ──────────────────────────────────────
-- Move amount from available → pending (dispute open)
CREATE OR REPLACE FUNCTION balance_freeze(
  p_seller_id TEXT,
  p_amount DECIMAL,
  p_reason TEXT DEFAULT 'dispute',
  p_ref_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_balance RECORD;
BEGIN
  SELECT * INTO v_balance FROM seller_balances
  WHERE seller_id = p_seller_id::UUID
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'SELLER_NOT_FOUND');
  END IF;

  -- If insufficient available, freeze what's there
  DECLARE
    v_freeze_amount DECIMAL := LEAST(p_amount, v_balance.available_balance);
  BEGIN
    UPDATE seller_balances
    SET available_balance = available_balance - v_freeze_amount,
        pending_balance = pending_balance + v_freeze_amount
    WHERE seller_id = p_seller_id::UUID;

    -- Audit
    INSERT INTO seller_transactions (seller_id, type, amount, net_amount, status, description)
    VALUES (p_seller_id::UUID, 'freeze', v_freeze_amount, 0, 'completed',
            'Frozen: ' || p_reason || COALESCE(' ref:' || p_ref_id, ''));

    RETURN jsonb_build_object(
      'success', true,
      'frozen', v_freeze_amount,
      'requested', p_amount,
      'new_available', v_balance.available_balance - v_freeze_amount,
      'new_pending', v_balance.pending_balance + v_freeze_amount
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- ─── balance_unfreeze ────────────────────────────────────
-- Move amount from pending → available (dispute won)
CREATE OR REPLACE FUNCTION balance_unfreeze(
  p_seller_id TEXT,
  p_amount DECIMAL,
  p_reason TEXT DEFAULT 'dispute_won',
  p_ref_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_balance RECORD;
  v_unfreeze_amount DECIMAL;
BEGIN
  SELECT * INTO v_balance FROM seller_balances
  WHERE seller_id = p_seller_id::UUID
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'SELLER_NOT_FOUND');
  END IF;

  v_unfreeze_amount := LEAST(p_amount, v_balance.pending_balance);

  UPDATE seller_balances
  SET pending_balance = pending_balance - v_unfreeze_amount,
      available_balance = available_balance + v_unfreeze_amount
  WHERE seller_id = p_seller_id::UUID;

  INSERT INTO seller_transactions (seller_id, type, amount, net_amount, status, description)
  VALUES (p_seller_id::UUID, 'unfreeze', v_unfreeze_amount, 0, 'completed',
          'Unfrozen: ' || p_reason || COALESCE(' ref:' || p_ref_id, ''));

  RETURN jsonb_build_object(
    'success', true,
    'unfrozen', v_unfreeze_amount,
    'new_available', v_balance.available_balance + v_unfreeze_amount,
    'new_pending', v_balance.pending_balance - v_unfreeze_amount
  );
END;
$$ LANGUAGE plpgsql;

-- ─── balance_deduct_pending ──────────────────────────────
-- Deduct from pending_balance only (dispute lost)
CREATE OR REPLACE FUNCTION balance_deduct_pending(
  p_seller_id TEXT,
  p_amount DECIMAL,
  p_reason TEXT DEFAULT 'dispute_lost'
) RETURNS JSONB AS $$
DECLARE
  v_balance RECORD;
  v_deduct_amount DECIMAL;
BEGIN
  SELECT * INTO v_balance FROM seller_balances
  WHERE seller_id = p_seller_id::UUID
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'SELLER_NOT_FOUND');
  END IF;

  v_deduct_amount := LEAST(p_amount, v_balance.pending_balance);

  UPDATE seller_balances
  SET pending_balance = pending_balance - v_deduct_amount
  WHERE seller_id = p_seller_id::UUID;

  INSERT INTO seller_transactions (seller_id, type, amount, net_amount, status, description)
  VALUES (p_seller_id::UUID, 'dispute_loss', v_deduct_amount, -v_deduct_amount, 'completed',
          'Dispute lost: ' || p_reason);

  RETURN jsonb_build_object(
    'success', true,
    'deducted', v_deduct_amount,
    'new_pending', v_balance.pending_balance - v_deduct_amount
  );
END;
$$ LANGUAGE plpgsql;

-- ─── stock_deduct ────────────────────────────────────────
-- Atomic stock deduction with movement record
CREATE OR REPLACE FUNCTION stock_deduct(
  p_product_id TEXT,
  p_quantity INTEGER,
  p_ref_type TEXT DEFAULT 'sale',
  p_ref_id TEXT DEFAULT NULL,
  p_performed_by TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_product RECORD;
  v_new_stock INTEGER;
BEGIN
  -- Lock the product row
  SELECT id, stock_quantity, seller_id, title INTO v_product
  FROM products
  WHERE id = p_product_id::UUID
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PRODUCT_NOT_FOUND');
  END IF;

  IF v_product.stock_quantity < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_STOCK',
      'available', v_product.stock_quantity,
      'requested', p_quantity
    );
  END IF;

  v_new_stock := v_product.stock_quantity - p_quantity;

  -- Update stock
  UPDATE products
  SET stock_quantity = v_new_stock
  WHERE id = p_product_id::UUID;

  -- Record movement
  INSERT INTO inventory_movements (product_id, seller_id, type, quantity, previous_stock, new_stock, reference_id, reference_type, performed_by, notes)
  VALUES (
    p_product_id::UUID,
    v_product.seller_id,
    p_ref_type,
    -p_quantity,
    v_product.stock_quantity,
    v_new_stock,
    CASE WHEN p_ref_id IS NOT NULL THEN p_ref_id::UUID ELSE NULL END,
    p_ref_type,
    p_performed_by,
    p_ref_type || COALESCE(' ref:' || p_ref_id, '')
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_stock', v_product.stock_quantity,
    'new_stock', v_new_stock,
    'deducted', p_quantity
  );
END;
$$ LANGUAGE plpgsql;

-- ─── stock_restore ───────────────────────────────────────
-- Atomic stock restoration with movement record
CREATE OR REPLACE FUNCTION stock_restore(
  p_product_id TEXT,
  p_quantity INTEGER,
  p_ref_type TEXT DEFAULT 'return',
  p_ref_id TEXT DEFAULT NULL,
  p_performed_by TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_product RECORD;
  v_new_stock INTEGER;
BEGIN
  SELECT id, stock_quantity, seller_id INTO v_product
  FROM products
  WHERE id = p_product_id::UUID
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PRODUCT_NOT_FOUND');
  END IF;

  v_new_stock := v_product.stock_quantity + p_quantity;

  UPDATE products
  SET stock_quantity = v_new_stock
  WHERE id = p_product_id::UUID;

  INSERT INTO inventory_movements (product_id, seller_id, type, quantity, previous_stock, new_stock, reference_id, reference_type, performed_by, notes)
  VALUES (
    p_product_id::UUID,
    v_product.seller_id,
    p_ref_type,
    p_quantity,
    v_product.stock_quantity,
    v_new_stock,
    CASE WHEN p_ref_id IS NOT NULL THEN p_ref_id::UUID ELSE NULL END,
    p_ref_type,
    p_performed_by,
    p_ref_type || COALESCE(' ref:' || p_ref_id, '')
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_stock', v_product.stock_quantity,
    'new_stock', v_new_stock,
    'restored', p_quantity
  );
END;
$$ LANGUAGE plpgsql;

-- ─── coupon_redeem ───────────────────────────────────────
-- Atomic coupon usage increment with max_uses check
CREATE OR REPLACE FUNCTION coupon_redeem(
  p_coupon_id TEXT,
  p_max_uses INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_coupon RECORD;
  v_max INTEGER;
BEGIN
  SELECT * INTO v_coupon FROM coupon_codes
  WHERE id = p_coupon_id::UUID
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'COUPON_NOT_FOUND');
  END IF;

  v_max := COALESCE(p_max_uses, v_coupon.max_uses);

  IF v_max IS NOT NULL AND v_coupon.current_uses >= v_max THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'COUPON_EXHAUSTED',
      'current_uses', v_coupon.current_uses,
      'max_uses', v_max
    );
  END IF;

  UPDATE coupon_codes
  SET current_uses = current_uses + 1
  WHERE id = p_coupon_id::UUID;

  RETURN jsonb_build_object(
    'success', true,
    'new_uses', v_coupon.current_uses + 1,
    'max_uses', v_max
  );
END;
$$ LANGUAGE plpgsql;

-- ─── webhook_claim ───────────────────────────────────────
-- Persistent webhook idempotency using INSERT ON CONFLICT
CREATE OR REPLACE FUNCTION webhook_claim(
  p_event_id TEXT,
  p_event_type TEXT,
  p_source TEXT DEFAULT 'stripe',
  p_payload JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- Try to insert
  INSERT INTO webhook_events (event_id, event_type, source, payload, status)
  VALUES (p_event_id, p_event_type, p_source, p_payload, 'processing')
  ON CONFLICT (event_id) DO NOTHING;

  -- Check if we got it
  SELECT * INTO v_existing FROM webhook_events
  WHERE event_id = p_event_id;

  IF v_existing.status = 'processing' AND v_existing.attempts = 1 THEN
    -- We claimed it
    RETURN jsonb_build_object(
      'claimed', true,
      'duplicate', false,
      'webhook_event_id', v_existing.id
    );
  ELSE
    -- Already existed (duplicate) or retry
    UPDATE webhook_events
    SET attempts = attempts + 1
    WHERE event_id = p_event_id;

    RETURN jsonb_build_object(
      'claimed', false,
      'duplicate', true,
      'status', v_existing.status,
      'attempts', v_existing.attempts + 1
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─── CLEANUP: Expired webhook events ─────────────────────
-- Call periodically via cron to remove old events
CREATE OR REPLACE FUNCTION cleanup_expired_webhooks()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM webhook_events
  WHERE expires_at < NOW() AND status IN ('completed', 'failed');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
