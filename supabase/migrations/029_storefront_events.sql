-- ============================================================
-- Migration 029: storefront_events
-- Lightweight event stream for traffic & conversion analytics.
--
-- Event types:
--   page_view       — any page load
--   product_view    — product detail page opened
--   add_to_cart     — item added to cart
--   begin_checkout  — checkout page opened
--   purchase        — order confirmed / payment succeeded
-- ============================================================

CREATE TABLE IF NOT EXISTS public.storefront_events (
  id          BIGSERIAL     PRIMARY KEY,
  event_type  VARCHAR(32)   NOT NULL,
  session_id  VARCHAR(64),
  user_id     UUID,
  seller_id   UUID,
  product_id  UUID,
  order_id    UUID,
  value       NUMERIC(10,2),
  metadata    JSONB,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='storefront_events' AND indexname='idx_se_event_type') THEN
    CREATE INDEX idx_se_event_type ON public.storefront_events(event_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='storefront_events' AND indexname='idx_se_seller_id') THEN
    CREATE INDEX idx_se_seller_id ON public.storefront_events(seller_id) WHERE seller_id IS NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='storefront_events' AND indexname='idx_se_product_id') THEN
    CREATE INDEX idx_se_product_id ON public.storefront_events(product_id) WHERE product_id IS NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='storefront_events' AND indexname='idx_se_created_at') THEN
    CREATE INDEX idx_se_created_at ON public.storefront_events(created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='storefront_events' AND indexname='idx_se_session') THEN
    CREATE INDEX idx_se_session ON public.storefront_events(session_id) WHERE session_id IS NOT NULL;
  END IF;
END $$;

-- ── RLS: write-only for everyone; reads go through service_role only ─────────

ALTER TABLE public.storefront_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "se_insert_all"        ON public.storefront_events;
DROP POLICY IF EXISTS "se_service_role_all"  ON public.storefront_events;

-- Anyone (including anonymous) can INSERT events
CREATE POLICY "se_insert_all"
  ON public.storefront_events FOR INSERT
  WITH CHECK (true);

-- Service role has full access (for admin/analytics reads)
CREATE POLICY "se_service_role_all"
  ON public.storefront_events TO service_role
  USING (true) WITH CHECK (true);

-- ── Retention: auto-delete events older than 90 days ─────────────────────────
-- (Optional — relies on pg_cron extension. Safe to skip if not available.)
-- SELECT cron.schedule('delete-old-events','0 3 * * *',
--   $$DELETE FROM public.storefront_events WHERE created_at < NOW() - INTERVAL '90 days'$$);

COMMENT ON TABLE public.storefront_events IS
  'Lightweight funnel analytics: page_view → product_view → add_to_cart → begin_checkout → purchase';
