-- ─── Migration 008: Seller Payouts ──────────────────────────────────────────
-- Replaces ad-hoc withdrawal_requests with a proper payout state machine.
-- Status flow: requested → approved → processing → paid
--                                   ↘ rejected
--                                              ↘ failed
-- ---------------------------------------------------------------------------

-- 1. Create table
-- Drop first so this migration is safe to re-run (idempotent via DROP+CREATE)
DROP TABLE IF EXISTS seller_payouts CASCADE;

CREATE TABLE seller_payouts (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id           UUID        NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  amount              NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency            TEXT        NOT NULL DEFAULT 'EUR',
  status              TEXT        NOT NULL DEFAULT 'requested'
                                  CHECK (status IN ('requested','approved','processing','paid','rejected','failed')),
  -- timestamps for each state transition
  requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at         TIMESTAMPTZ,
  processing_at       TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  rejected_at         TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  -- human-readable context
  failure_reason      TEXT,
  rejection_reason    TEXT,
  -- external payment info (filled when status = 'paid')
  payout_provider     TEXT,
  provider_payout_id  TEXT,
  -- admin who took action
  approved_by         TEXT,
  rejected_by         TEXT,
  paid_by             TEXT,
  -- idempotency: ledger externalReferenceId = 'payout_' || id
  ledger_tx_id        UUID,
  -- audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX idx_seller_payouts_seller_status ON seller_payouts (seller_id, status);
CREATE INDEX idx_seller_payouts_status_requested ON seller_payouts (status, requested_at DESC);

-- 3. updated_at trigger
CREATE OR REPLACE FUNCTION _set_seller_payouts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_seller_payouts_updated_at ON seller_payouts;
CREATE TRIGGER trg_seller_payouts_updated_at
  BEFORE UPDATE ON seller_payouts
  FOR EACH ROW EXECUTE FUNCTION _set_seller_payouts_updated_at();

-- 4. RLS
ALTER TABLE seller_payouts ENABLE ROW LEVEL SECURITY;

-- Sellers can read their own payouts
-- Note: sellers.user_id is TEXT; auth.uid() is UUID — cast to text for comparison
DROP POLICY IF EXISTS "sellers_read_own_payouts" ON seller_payouts;
CREATE POLICY "sellers_read_own_payouts"
  ON seller_payouts FOR SELECT
  USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()::text
    )
  );

-- Sellers can request (insert) their own payouts
DROP POLICY IF EXISTS "sellers_insert_own_payouts" ON seller_payouts;
CREATE POLICY "sellers_insert_own_payouts"
  ON seller_payouts FOR INSERT
  WITH CHECK (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()::text
    )
  );

-- Admins use supabaseAdmin (bypasses RLS) — no separate policy needed.

-- 5. Comments
COMMENT ON TABLE seller_payouts IS 'Payout requests from sellers. State machine: requested→approved→processing→paid/rejected/failed';
COMMENT ON COLUMN seller_payouts.ledger_tx_id IS 'UUID of the ledger_transactions row written when status=paid';
