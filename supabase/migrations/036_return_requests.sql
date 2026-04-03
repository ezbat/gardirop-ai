-- Return requests table.
-- Tracks customer return/refund requests across the order lifecycle.
-- Integrates with: order state machine, Stripe refunds, ledger engine.

CREATE TABLE IF NOT EXISTS return_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id              TEXT NOT NULL,
  seller_id            UUID REFERENCES sellers(id),
  status               TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',        -- customer submitted, awaiting seller review
      'approved',       -- seller approved return
      'rejected',       -- seller rejected return
      'received',       -- seller confirms item received back
      'refund_pending', -- admin/system processing refund
      'refunded',       -- Stripe refund completed
      'cancelled'       -- customer cancelled request
    )),
  reason               TEXT NOT NULL
    CHECK (reason IN (
      'size_issue',
      'wrong_item',
      'defective',
      'not_as_described',
      'changed_mind',
      'other'
    )),
  description          TEXT,
  refund_amount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  seller_response      TEXT,
  rejection_reason     TEXT,
  admin_notes          TEXT,
  stripe_refund_id     TEXT,
  requested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at          TIMESTAMPTZ,
  received_at          TIMESTAMPTZ,
  refund_processed_at  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rr_order    ON return_requests (order_id);
CREATE INDEX IF NOT EXISTS idx_rr_user     ON return_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_rr_seller   ON return_requests (seller_id);
CREATE INDEX IF NOT EXISTS idx_rr_status   ON return_requests (status);

-- One active return per order (prevent duplicates)
-- Only block if status is NOT rejected/cancelled
CREATE UNIQUE INDEX IF NOT EXISTS idx_rr_one_active_per_order
  ON return_requests (order_id)
  WHERE status NOT IN ('rejected', 'cancelled');

-- Return items (tracks which order_items are being returned)
CREATE TABLE IF NOT EXISTS return_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id   UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  order_item_id       UUID NOT NULL,
  quantity            INTEGER NOT NULL DEFAULT 1,
  reason              TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ri_request ON return_items (return_request_id);

-- RLS: service_role only (all access goes through supabaseAdmin)
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_return_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_return_requests_updated_at ON return_requests;
CREATE TRIGGER trg_return_requests_updated_at
  BEFORE UPDATE ON return_requests
  FOR EACH ROW EXECUTE FUNCTION update_return_requests_updated_at();
