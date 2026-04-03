-- Support ticket system.
-- Threaded tickets for customer ↔ admin and seller ↔ admin communication.
-- Replaces the old seller_messages table with a proper ticket + message model.

-- ═══════════════════════════════════════════════════════════════
-- 1. support_tickets
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS support_tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Who opened this ticket
  opened_by_user_id TEXT,                                     -- NextAuth user id (customer or seller's user)
  seller_id         UUID REFERENCES sellers(id),              -- set when opened by seller

  -- Routing
  recipient_type    TEXT NOT NULL CHECK (recipient_type IN ('customer', 'seller', 'admin')),
  scope             TEXT NOT NULL CHECK (scope IN ('order', 'return', 'payout', 'product', 'account', 'general')),
  scope_id          TEXT,                                     -- UUID of related order, return, payout, or product

  -- Content
  subject           TEXT NOT NULL,

  -- Lifecycle
  status            TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'waiting_seller', 'resolved', 'closed')),
  priority          TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Tracking
  last_message_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_to       TEXT                                       -- optional admin assignee
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_st_status_created
  ON support_tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_st_user
  ON support_tickets (opened_by_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_st_seller
  ON support_tickets (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_st_scope
  ON support_tickets (scope, scope_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_support_tickets_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 2. support_ticket_messages
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id         UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Who sent this message
  sender_type       TEXT NOT NULL CHECK (sender_type IN ('customer', 'seller', 'admin', 'system')),
  sender_user_id    TEXT,                                     -- NextAuth user id
  sender_seller_id  UUID REFERENCES sellers(id),

  -- Content
  body              TEXT NOT NULL,

  -- Admin-only notes (not visible to customer/seller)
  internal_note     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_stm_ticket
  ON support_ticket_messages (ticket_id, created_at ASC);

-- ═══════════════════════════════════════════════════════════════
-- 3. RLS — service_role only
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
-- No RLS policies = only service_role (supabaseAdmin) can access.
