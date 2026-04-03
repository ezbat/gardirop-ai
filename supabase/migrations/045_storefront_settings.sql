-- ============================================================================
-- 045: Storefront Settings + Slug Uniqueness
-- ============================================================================
-- Creates the storefront_settings table for per-seller storefront config.
-- Also ensures shop_slug uniqueness on the sellers table.
-- ============================================================================

-- 1. Ensure shop_slug has a unique index (partial: only non-null slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sellers_shop_slug_unique
  ON sellers (shop_slug)
  WHERE shop_slug IS NOT NULL;

-- 2. Storefront settings table
CREATE TABLE IF NOT EXISTS storefront_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id     UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,

  -- Display
  headline      TEXT,                          -- Hero headline override
  sub_headline  TEXT,                          -- Hero sub-headline

  -- Theme (controlled presets, not free CSS)
  theme_preset  TEXT NOT NULL DEFAULT 'dark',  -- 'dark' | 'light' | 'minimal'
  accent_color  TEXT DEFAULT '#D97706',        -- Amber/gold default

  -- Layout
  layout_style  TEXT NOT NULL DEFAULT 'grid',  -- 'grid' | 'list' | 'masonry'
  products_per_row INT NOT NULL DEFAULT 4 CHECK (products_per_row BETWEEN 2 AND 6),
  show_brand    BOOLEAN NOT NULL DEFAULT true,
  show_prices   BOOLEAN NOT NULL DEFAULT true,
  show_ratings  BOOLEAN NOT NULL DEFAULT true,

  -- Featured
  featured_product_ids UUID[] DEFAULT '{}',    -- Manually pinned products

  -- Social links (displayed on storefront)
  social_instagram TEXT,
  social_tiktok    TEXT,
  social_youtube   TEXT,
  social_website   TEXT,

  -- SEO
  seo_title       TEXT,                        -- Override for <title>
  seo_description TEXT,                        -- Override for meta description

  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_storefront_settings_seller UNIQUE (seller_id)
);

-- RLS
ALTER TABLE storefront_settings ENABLE ROW LEVEL SECURITY;

-- Public read (storefront is public)
CREATE POLICY storefront_settings_public_read ON storefront_settings
  FOR SELECT USING (true);

-- Seller can update own settings
CREATE POLICY storefront_settings_seller_update ON storefront_settings
  FOR UPDATE USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

-- Service role full access (for admin + API routes using supabaseAdmin)
CREATE POLICY storefront_settings_service ON storefront_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-create storefront_settings when a seller is inserted
CREATE OR REPLACE FUNCTION create_default_storefront_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO storefront_settings (seller_id)
  VALUES (NEW.id)
  ON CONFLICT (seller_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_storefront_settings ON sellers;
CREATE TRIGGER trg_create_storefront_settings
  AFTER INSERT ON sellers
  FOR EACH ROW
  EXECUTE FUNCTION create_default_storefront_settings();

-- Backfill: create settings for existing sellers that don't have them
INSERT INTO storefront_settings (seller_id)
SELECT id FROM sellers
WHERE id NOT IN (SELECT seller_id FROM storefront_settings)
ON CONFLICT (seller_id) DO NOTHING;
