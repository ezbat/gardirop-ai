-- ═══════════════════════════════════════════════════════════
-- WEARO Marketplace Database Hardening Migration
-- Part 2: Complete relational model for production marketplace
-- ═══════════════════════════════════════════════════════════

-- ─── CAMPAIGNS TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('discount', 'flash_sale', 'seasonal', 'sponsored')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  budget DECIMAL(10,2) NOT NULL CHECK (budget > 0),
  spent DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (spent >= 0),
  revenue_generated DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) CHECK (discount_percent >= 0 AND discount_percent <= 90),
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT campaign_dates_valid CHECK (end_date > start_date),
  CONSTRAINT campaign_spent_within_budget CHECK (spent <= budget)
);

-- ─── CAMPAIGN PRODUCTS (many-to-many) ────────────────────
CREATE TABLE IF NOT EXISTS campaign_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, product_id)
);

-- ─── AD SPEND TRACKING ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_spend (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  spend DECIMAL(10,2) NOT NULL DEFAULT 0,
  revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);

-- ─── INVENTORY MOVEMENTS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN', 'DAMAGED')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reference_id UUID,  -- order_id, restock_id, etc.
  reference_type VARCHAR(30), -- 'order', 'manual', 'return'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TAX REPORTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tax_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL,  -- '2025-Q1', '2025-01', etc.
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
  total_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_tax_collected DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_fees DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 19.00,
  country VARCHAR(2) NOT NULL DEFAULT 'DE',
  status VARCHAR(20) NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'filed', 'paid')),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, period, period_type)
);

-- ─── REVIEWS TABLE (ensure exists) ──────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  comment TEXT,
  images TEXT[],
  helpful_count INTEGER NOT NULL DEFAULT 0,
  is_verified_purchase BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('pending', 'published', 'hidden', 'flagged')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SELLER STORE THEME CONFIG ───────────────────────────
-- Add theme_config to sellers table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sellers' AND column_name = 'theme_config'
  ) THEN
    ALTER TABLE sellers ADD COLUMN theme_config JSONB DEFAULT '{
      "storeBackground": "white",
      "primaryColor": "purple",
      "secondaryColor": "gray",
      "productCardStyle": "minimal",
      "productCardBackground": "white",
      "layoutStyle": "grid"
    }'::jsonb;
  END IF;
END $$;

-- ─── ADD PLATFORM FEE TO ORDERS ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'platform_fee'
  ) THEN
    ALTER TABLE orders ADD COLUMN platform_fee DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'seller_earnings'
  ) THEN
    ALTER TABLE orders ADD COLUMN seller_earnings DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'tax_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- ─── ADD LOW STOCK THRESHOLD TO PRODUCTS ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'low_stock_threshold'
  ) THEN
    ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'sku'
  ) THEN
    ALTER TABLE products ADD COLUMN sku VARCHAR(50);
  END IF;
END $$;

-- ─── INDEXES FOR PERFORMANCE ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_campaigns_seller ON campaigns(seller_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ad_spend_campaign ON ad_spend(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_ad_spend_seller ON ad_spend(seller_id, date);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_movements(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_seller ON inventory_movements(seller_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory_movements(type, created_at);
CREATE INDEX IF NOT EXISTS idx_tax_reports_seller ON tax_reports(seller_id, period);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_seller ON reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, payment_status);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity) WHERE stock_quantity <= 5;
CREATE INDEX IF NOT EXISTS idx_campaign_products_campaign ON campaign_products(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_products_product ON campaign_products(product_id);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['campaigns', 'reviews', 'products', 'orders', 'sellers'])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ─── RLS POLICIES ────────────────────────────────────────
-- Enable RLS on new tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for API routes using supabaseAdmin)
-- These policies allow the service role full access
CREATE POLICY IF NOT EXISTS "Service role full access" ON campaigns FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON campaign_products FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON ad_spend FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON inventory_movements FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON tax_reports FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Service role full access" ON reviews FOR ALL USING (true);
