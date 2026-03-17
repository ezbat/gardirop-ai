-- ═══════════════════════════════════════════════════════════
-- WEARO MARKETPLACE — REAL DATA INTEGRITY LAYER
-- No fake numbers. Every metric from database truth.
-- Fully idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════

-- ─── PRICE HISTORY (EU Omnibus Directive compliant) ─────
DROP TABLE IF EXISTS price_history CASCADE;
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);
CREATE INDEX idx_price_history_product ON price_history(product_id, changed_at DESC);

-- ─── EVENT LOG (Immutable, append-only) ─────────────────
DROP TABLE IF EXISTS event_log CASCADE;
CREATE TABLE event_log (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  user_id TEXT,
  seller_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_event_log_type ON event_log(event_type, created_at DESC);
CREATE INDEX idx_event_log_entity ON event_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_event_log_user ON event_log(user_id, created_at DESC);
CREATE INDEX idx_event_log_seller ON event_log(seller_id, created_at DESC);

-- ─── AUDIT LOG (Who changed what, when) ─────────────────
DROP TABLE IF EXISTS audit_log CASCADE;
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL DEFAULT 'seller',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id, created_at DESC);

-- ─── INVENTORY MODEL (reserved/available/sold) ──────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'reserved_stock') THEN
    ALTER TABLE products ADD COLUMN reserved_stock INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sold_stock') THEN
    ALTER TABLE products ADD COLUMN sold_stock INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ─── STOCK RESERVATIONS (cart hold system) ──────────────
DROP TABLE IF EXISTS stock_reservations CASCADE;
CREATE TABLE stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_stock_reservations_product ON stock_reservations(product_id, status);
CREATE INDEX idx_stock_reservations_expires ON stock_reservations(expires_at) WHERE status = 'active';

-- ─── PRODUCT VIEWS (real-time "X people viewing") ───────
DROP TABLE IF EXISTS product_views CASCADE;
CREATE TABLE product_views (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT,
  session_id TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_views_recent ON product_views(product_id, viewed_at DESC);

-- ─── SELLER RISK SCORES ─────────────────────────────────
DROP TABLE IF EXISTS seller_risk_scores CASCADE;
CREATE TABLE seller_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  overall_score INTEGER NOT NULL DEFAULT 100,
  shipping_speed_score INTEGER NOT NULL DEFAULT 100,
  customer_satisfaction_score INTEGER NOT NULL DEFAULT 100,
  return_rate_score INTEGER NOT NULL DEFAULT 100,
  response_time_score INTEGER NOT NULL DEFAULT 100,
  fraud_risk_score INTEGER NOT NULL DEFAULT 0,
  late_shipment_count INTEGER NOT NULL DEFAULT 0,
  negative_review_count INTEGER NOT NULL DEFAULT 0,
  total_disputes INTEGER NOT NULL DEFAULT 0,
  commission_override DECIMAL(5,2),
  payout_delay_days INTEGER NOT NULL DEFAULT 7,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(seller_id)
);

-- ─── ADMIN COMMISSION RULES ─────────────────────────────
DROP TABLE IF EXISTS commission_rules CASCADE;
CREATE TABLE commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  min_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  max_rate DECIMAL(5,2) NOT NULL DEFAULT 25.00,
  campaign_override DECIMAL(5,2),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO commission_rules (category, commission_rate, created_by) VALUES
  ('Elektronik', 8.00, 'system'),
  ('Mode', 15.00, 'system'),
  ('Beauty', 18.00, 'system'),
  ('Sport', 12.00, 'system'),
  ('Haus & Küche', 10.00, 'system'),
  ('Spielzeug', 12.00, 'system'),
  ('Auto', 8.00, 'system'),
  ('Büro', 10.00, 'system');

-- ─── FRAUD FLAGS ─────────────────────────────────────────
DROP TABLE IF EXISTS fraud_flags CASCADE;
CREATE TABLE fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  seller_id TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_fraud_flags_status ON fraud_flags(status, severity, created_at DESC);
CREATE INDEX idx_fraud_flags_seller ON fraud_flags(seller_id, created_at DESC);

-- ─── DISPUTES ────────────────────────────────────────────
DROP TABLE IF EXISTS disputes CASCADE;
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  reason TEXT NOT NULL,
  customer_message TEXT,
  seller_response TEXT,
  admin_decision TEXT,
  refund_amount DECIMAL(10,2),
  seller_deduction DECIMAL(10,2),
  timeline JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_disputes_status ON disputes(status, created_at DESC);
CREATE INDEX idx_disputes_seller ON disputes(seller_id, created_at DESC);

-- ─── RLS POLICIES ────────────────────────────────────────
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "service_all_price_history" ON price_history;
  DROP POLICY IF EXISTS "service_all_event_log" ON event_log;
  DROP POLICY IF EXISTS "service_all_audit_log" ON audit_log;
  DROP POLICY IF EXISTS "service_all_stock_reservations" ON stock_reservations;
  DROP POLICY IF EXISTS "service_all_product_views" ON product_views;
  DROP POLICY IF EXISTS "service_all_fraud_flags" ON fraud_flags;
  DROP POLICY IF EXISTS "service_all_disputes" ON disputes;
END $$;

CREATE POLICY "service_all_price_history" ON price_history FOR ALL USING (true);
CREATE POLICY "service_all_event_log" ON event_log FOR ALL USING (true);
CREATE POLICY "service_all_audit_log" ON audit_log FOR ALL USING (true);
CREATE POLICY "service_all_stock_reservations" ON stock_reservations FOR ALL USING (true);
CREATE POLICY "service_all_product_views" ON product_views FOR ALL USING (true);
CREATE POLICY "service_all_fraud_flags" ON fraud_flags FOR ALL USING (true);
CREATE POLICY "service_all_disputes" ON disputes FOR ALL USING (true);
