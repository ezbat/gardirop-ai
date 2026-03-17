-- =====================================================================
-- 006_financial_infrastructure.sql
-- FAZ A: Production-Grade Financial Infrastructure
-- Double-entry ledger, payout engine, tax engine, FX, reconciliation, chargebacks
-- =====================================================================

-- ─── 1. DOUBLE-ENTRY LEDGER ─────────────────────────────────────────

-- Ledger accounts (the "chart of accounts")
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS ledger_transactions CASCADE;
DROP TABLE IF EXISTS ledger_accounts CASCADE;

CREATE TABLE ledger_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_type TEXT NOT NULL CHECK (account_type IN (
    'platform_cash',
    'seller_balance',
    'escrow',
    'commission_revenue',
    'refund_liability',
    'payment_fee_expense',
    'tax_collected'
  )),
  owner_id TEXT,                      -- seller_id or 'platform'
  owner_type TEXT NOT NULL DEFAULT 'platform' CHECK (owner_type IN ('platform', 'seller')),
  currency TEXT NOT NULL DEFAULT 'EUR',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_type, owner_id, currency)
);

-- Ledger transactions (groups of entries that must balance)
CREATE TABLE ledger_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN (
    'payment_received',
    'delivery_confirmed',
    'refund_issued',
    'chargeback_received',
    'chargeback_reversed',
    'payout_processed',
    'fee_collected',
    'tax_collected',
    'adjustment'
  )),
  reference_type TEXT NOT NULL CHECK (reference_type IN (
    'order', 'refund', 'chargeback', 'payout', 'adjustment'
  )),
  reference_id TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger entries (individual debit/credit lines)
CREATE TABLE ledger_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES ledger_accounts(id),
  debit_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Each entry must be either a debit or a credit, not both
  CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (debit_amount = 0 AND credit_amount > 0)
  )
);

CREATE INDEX idx_ledger_entries_transaction ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_account ON ledger_entries(account_id, created_at);
CREATE INDEX idx_ledger_transactions_ref ON ledger_transactions(reference_type, reference_id);
CREATE INDEX idx_ledger_transactions_type ON ledger_transactions(type, created_at);
CREATE INDEX idx_ledger_accounts_owner ON ledger_accounts(owner_id, account_type);

-- ─── 2. PAYOUT BATCHES ─────────────────────────────────────────────

DROP TABLE IF EXISTS payout_batches CASCADE;

CREATE TABLE payout_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  hold_reason TEXT,                    -- why it's held (risk, manual review, etc.)
  scheduled_date TIMESTAMPTZ NOT NULL,
  released_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'held', 'approved', 'processing', 'completed', 'failed', 'cancelled'
  )),
  risk_score INTEGER DEFAULT 0,
  stripe_transfer_id TEXT,
  stripe_payout_id TEXT,
  error_message TEXT,
  approved_by TEXT,                    -- admin who approved
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payout_batches_seller ON payout_batches(seller_id, status);
CREATE INDEX idx_payout_batches_scheduled ON payout_batches(scheduled_date, status);
CREATE INDEX idx_payout_batches_status ON payout_batches(status);

-- ─── 3. TAX ENGINE ──────────────────────────────────────────────────

DROP TABLE IF EXISTS order_tax_breakdown CASCADE;
DROP TABLE IF EXISTS tax_rates CASCADE;

-- Tax rates by country/region
CREATE TABLE tax_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country TEXT NOT NULL,               -- ISO 2-letter code
  region TEXT,                         -- US state, province, etc.
  tax_type TEXT NOT NULL CHECK (tax_type IN ('VAT', 'sales_tax', 'KDV', 'GST')),
  rate DECIMAL(5,2) NOT NULL,          -- standard rate
  reduced_rate DECIMAL(5,2),           -- reduced rate for food, books, etc.
  category TEXT,                       -- product category for reduced rates
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tax_rates_country ON tax_rates(country, tax_type);
CREATE INDEX idx_tax_rates_lookup ON tax_rates(country, region, category);

-- Per-order tax breakdown (snapshot at checkout)
CREATE TABLE order_tax_breakdown (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  tax_country TEXT NOT NULL,
  tax_type TEXT NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL,
  tax_amount DECIMAL(12,2) NOT NULL,
  net_amount DECIMAL(12,2) NOT NULL,   -- pre-tax
  gross_amount DECIMAL(12,2) NOT NULL, -- post-tax
  seller_vat_id TEXT,
  buyer_country TEXT,
  reverse_charge_flag BOOLEAN DEFAULT FALSE,
  marketplace_liable BOOLEAN DEFAULT TRUE, -- marketplace collects & remits
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_tax_order ON order_tax_breakdown(order_id);
CREATE INDEX idx_order_tax_country ON order_tax_breakdown(tax_country, created_at);

-- Seed common tax rates
INSERT INTO tax_rates (country, tax_type, rate, reduced_rate, category) VALUES
  ('DE', 'VAT', 19.00, 7.00, NULL),
  ('AT', 'VAT', 20.00, 10.00, NULL),
  ('FR', 'VAT', 20.00, 5.50, NULL),
  ('NL', 'VAT', 21.00, 9.00, NULL),
  ('IT', 'VAT', 22.00, 10.00, NULL),
  ('ES', 'VAT', 21.00, 10.00, NULL),
  ('BE', 'VAT', 21.00, 6.00, NULL),
  ('PL', 'VAT', 23.00, 8.00, NULL),
  ('SE', 'VAT', 25.00, 12.00, NULL),
  ('DK', 'VAT', 25.00, NULL, NULL),
  ('FI', 'VAT', 25.50, 14.00, NULL),
  ('PT', 'VAT', 23.00, 6.00, NULL),
  ('IE', 'VAT', 23.00, 13.50, NULL),
  ('GR', 'VAT', 24.00, 13.00, NULL),
  ('CZ', 'VAT', 21.00, 12.00, NULL),
  ('TR', 'KDV', 20.00, 10.00, NULL),
  ('GB', 'VAT', 20.00, 5.00, NULL),
  ('CH', 'VAT', 8.10, 2.60, NULL);

-- US state sales tax (major states)
INSERT INTO tax_rates (country, region, tax_type, rate) VALUES
  ('US', 'CA', 'sales_tax', 7.25),
  ('US', 'NY', 'sales_tax', 8.00),
  ('US', 'TX', 'sales_tax', 6.25),
  ('US', 'FL', 'sales_tax', 6.00),
  ('US', 'WA', 'sales_tax', 6.50),
  ('US', 'IL', 'sales_tax', 6.25),
  ('US', 'PA', 'sales_tax', 6.00),
  ('US', 'OH', 'sales_tax', 5.75),
  ('US', 'NJ', 'sales_tax', 6.625),
  ('US', 'OR', 'sales_tax', 0.00),
  ('US', 'NH', 'sales_tax', 0.00),
  ('US', 'DE', 'sales_tax', 0.00),
  ('US', 'MT', 'sales_tax', 0.00);

-- ─── 4. FX & MULTI-CURRENCY ────────────────────────────────────────

DROP TABLE IF EXISTS order_fx_snapshot CASCADE;
DROP TABLE IF EXISTS fx_rates CASCADE;

CREATE TABLE fx_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL,
  rate DECIMAL(12,6) NOT NULL,
  provider TEXT NOT NULL DEFAULT 'manual', -- 'ecb', 'stripe', 'manual'
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fx_rates_lookup ON fx_rates(base_currency, quote_currency, fetched_at DESC);

-- Per-order FX snapshot (immutable record of rate used)
CREATE TABLE order_fx_snapshot (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  original_currency TEXT NOT NULL,
  settlement_currency TEXT NOT NULL DEFAULT 'EUR',
  fx_rate_used DECIMAL(12,6) NOT NULL,
  original_amount DECIMAL(12,2) NOT NULL,
  settled_amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_fx_order ON order_fx_snapshot(order_id);

-- Seed baseline FX rates (EUR base)
INSERT INTO fx_rates (base_currency, quote_currency, rate, provider) VALUES
  ('EUR', 'USD', 1.0850, 'manual'),
  ('EUR', 'GBP', 0.8600, 'manual'),
  ('EUR', 'TRY', 38.50, 'manual'),
  ('EUR', 'CHF', 0.9400, 'manual'),
  ('USD', 'EUR', 0.9217, 'manual'),
  ('GBP', 'EUR', 1.1628, 'manual'),
  ('TRY', 'EUR', 0.0260, 'manual');

-- ─── 5. PAYMENT RECONCILIATION ──────────────────────────────────────

DROP TABLE IF EXISTS reconciliation_runs CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;

CREATE TABLE payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_transaction_id TEXT,        -- Stripe PaymentIntent ID
  gross_amount DECIMAL(12,2) NOT NULL,
  fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0,  -- Stripe processing fee
  net_settlement DECIMAL(12,2) NOT NULL,         -- gross - fee
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'settled', 'failed', 'disputed', 'refunded'
  )),
  chargeback_flag BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_tx_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_tx_provider ON payment_transactions(provider_transaction_id);
CREATE INDEX idx_payment_tx_status ON payment_transactions(status, created_at);

-- Daily reconciliation runs
CREATE TABLE reconciliation_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_date DATE NOT NULL,
  total_ledger DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_provider DECIMAL(12,2) NOT NULL DEFAULT 0,
  variance DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('matched', 'mismatch', 'pending')),
  matched_count INTEGER DEFAULT 0,
  mismatched_count INTEGER DEFAULT 0,
  mismatched_transactions JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reconciliation_date ON reconciliation_runs(run_date DESC);

-- ─── 6. CHARGEBACK CONTROL ──────────────────────────────────────────

DROP TABLE IF EXISTS chargebacks CASCADE;

CREATE TABLE chargebacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  payment_transaction_id UUID REFERENCES payment_transactions(id),
  stripe_dispute_id TEXT,
  reason_code TEXT,                     -- Stripe reason: 'fraudulent', 'duplicate', 'product_not_received', etc.
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'evidence_submitted', 'under_review', 'won', 'lost'
  )),
  seller_id TEXT,
  evidence_submitted BOOLEAN DEFAULT FALSE,
  evidence_deadline TIMESTAMPTZ,
  evidence_data JSONB,                  -- uploaded evidence metadata
  seller_deduction DECIMAL(12,2) DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chargebacks_order ON chargebacks(order_id);
CREATE INDEX idx_chargebacks_status ON chargebacks(status);
CREATE INDEX idx_chargebacks_seller ON chargebacks(seller_id, status);
CREATE INDEX idx_chargebacks_deadline ON chargebacks(evidence_deadline) WHERE status = 'open';

-- ─── 7. RLS POLICIES ────────────────────────────────────────────────

ALTER TABLE ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tax_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fx_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chargebacks ENABLE ROW LEVEL SECURITY;

-- Service role full access on all tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ledger_accounts', 'ledger_transactions', 'ledger_entries',
    'payout_batches', 'tax_rates', 'order_tax_breakdown',
    'fx_rates', 'order_fx_snapshot', 'payment_transactions',
    'reconciliation_runs', 'chargebacks'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "Service role full access on %I" ON %I', tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "Service role full access on %I" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ─── 8. RPC: ATOMIC LEDGER TRANSACTION ──────────────────────────────

CREATE OR REPLACE FUNCTION ledger_record_transaction(
  p_type TEXT,
  p_reference_type TEXT,
  p_reference_id TEXT,
  p_entries JSONB,         -- Array of { account_id, debit_amount, credit_amount, description }
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
  v_transaction_id UUID;
  v_total_debit DECIMAL(12,2) := 0;
  v_total_credit DECIMAL(12,2) := 0;
  v_entry JSONB;
BEGIN
  -- 1. Validate entries: sum debit must equal sum credit
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_total_debit := v_total_debit + COALESCE((v_entry->>'debit_amount')::DECIMAL, 0);
    v_total_credit := v_total_credit + COALESCE((v_entry->>'credit_amount')::DECIMAL, 0);
  END LOOP;

  IF v_total_debit != v_total_credit THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Unbalanced transaction: debit=%s credit=%s', v_total_debit, v_total_credit)
    );
  END IF;

  IF v_total_debit = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Transaction amount cannot be zero');
  END IF;

  -- 2. Create transaction record
  INSERT INTO ledger_transactions (type, reference_type, reference_id, description, metadata)
  VALUES (p_type, p_reference_type, p_reference_id, p_description, p_metadata)
  RETURNING id INTO v_transaction_id;

  -- 3. Create all entries
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    INSERT INTO ledger_entries (
      transaction_id, account_id, debit_amount, credit_amount, currency, description
    ) VALUES (
      v_transaction_id,
      (v_entry->>'account_id')::UUID,
      COALESCE((v_entry->>'debit_amount')::DECIMAL, 0),
      COALESCE((v_entry->>'credit_amount')::DECIMAL, 0),
      COALESCE(v_entry->>'currency', 'EUR'),
      v_entry->>'description'
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'total_amount', v_total_debit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 9. RPC: CALCULATE SELLER PAYABLE AMOUNT ────────────────────────

CREATE OR REPLACE FUNCTION calculate_seller_payout(
  p_seller_id TEXT
) RETURNS JSON AS $$
DECLARE
  v_available DECIMAL(12,2) := 0;
  v_pending_refunds DECIMAL(12,2) := 0;
  v_chargeback_reserve DECIMAL(12,2) := 0;
  v_pending_payouts DECIMAL(12,2) := 0;
  v_payable DECIMAL(12,2);
BEGIN
  -- Get available balance
  SELECT COALESCE(available_balance, 0) INTO v_available
  FROM seller_balances WHERE seller_id = p_seller_id::UUID;

  -- Subtract pending refunds (orders with refund in progress)
  SELECT COALESCE(SUM(seller_earnings), 0) INTO v_pending_refunds
  FROM orders
  WHERE seller_id = p_seller_id::UUID
    AND payment_status = 'refund_pending';

  -- Subtract active chargeback amounts
  SELECT COALESCE(SUM(amount), 0) INTO v_chargeback_reserve
  FROM chargebacks
  WHERE seller_id = p_seller_id
    AND status IN ('open', 'evidence_submitted', 'under_review');

  -- Subtract pending/processing payouts
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_payouts
  FROM payout_batches
  WHERE seller_id = p_seller_id
    AND status IN ('pending', 'approved', 'processing');

  v_payable := GREATEST(v_available - v_pending_refunds - v_chargeback_reserve - v_pending_payouts, 0);

  RETURN json_build_object(
    'available_balance', v_available,
    'pending_refunds', v_pending_refunds,
    'chargeback_reserve', v_chargeback_reserve,
    'pending_payouts', v_pending_payouts,
    'payable_amount', v_payable
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 10. PLATFORM LEDGER ACCOUNTS (seed) ────────────────────────────

INSERT INTO ledger_accounts (account_type, owner_id, owner_type, currency, description)
VALUES
  ('platform_cash', 'platform', 'platform', 'EUR', 'Platform cash from payments'),
  ('escrow', 'platform', 'platform', 'EUR', 'Escrow holding until delivery'),
  ('commission_revenue', 'platform', 'platform', 'EUR', 'Platform commission earnings'),
  ('refund_liability', 'platform', 'platform', 'EUR', 'Pending refund obligations'),
  ('payment_fee_expense', 'platform', 'platform', 'EUR', 'Payment processor fees (Stripe)'),
  ('tax_collected', 'platform', 'platform', 'EUR', 'VAT/tax collected for remittance')
ON CONFLICT (account_type, owner_id, currency) DO NOTHING;
