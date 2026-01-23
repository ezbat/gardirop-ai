-- Wearo Outfit Collections System Migration
-- Creates tables and triggers for seller-curated outfit collections

-- ==========================================
-- 1. CREATE OUTFIT_COLLECTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS outfit_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  season VARCHAR(50), -- 'Spring', 'Summer', 'Fall', 'Winter', 'All Season'
  occasion VARCHAR(50), -- 'Casual', 'Formal', 'Sport', 'Party', 'Work'
  style_tags TEXT[], -- ['Minimalist', 'Bohemian', 'Street', etc.]
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_outfit_collections_seller ON outfit_collections(seller_id);
CREATE INDEX IF NOT EXISTS idx_outfit_collections_active ON outfit_collections(is_active);
CREATE INDEX IF NOT EXISTS idx_outfit_collections_season ON outfit_collections(season);
CREATE INDEX IF NOT EXISTS idx_outfit_collections_occasion ON outfit_collections(occasion);

-- ==========================================
-- 2. CREATE OUTFIT_ITEMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS outfit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID NOT NULL REFERENCES outfit_collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Prevent duplicate products in same outfit
  UNIQUE(outfit_id, product_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit ON outfit_items(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_items_product ON outfit_items(product_id);

-- ==========================================
-- 3. ALTER CLOTHES TABLE (Add purchase tracking)
-- ==========================================
ALTER TABLE clothes
  ADD COLUMN IF NOT EXISTS purchased_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_purchased BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clothes_purchased_product ON clothes(purchased_product_id);
CREATE INDEX IF NOT EXISTS idx_clothes_order ON clothes(order_id);
CREATE INDEX IF NOT EXISTS idx_clothes_is_purchased ON clothes(is_purchased);

-- ==========================================
-- 4. ALTER PRODUCTS TABLE (Add outfit metadata)
-- ==========================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS outfit_category VARCHAR(100); -- 'Top', 'Bottom', 'Outerwear', 'Shoes', 'Accessory'

CREATE INDEX IF NOT EXISTS idx_products_outfit_category ON products(outfit_category);

-- ==========================================
-- 5. TRIGGER: Auto-add purchased items to wardrobe
-- ==========================================
CREATE OR REPLACE FUNCTION add_purchased_items_to_wardrobe()
RETURNS TRIGGER AS $$
BEGIN
  -- Only when order status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Insert all order items into wardrobe
    INSERT INTO clothes (
      user_id,
      name,
      category,
      brand,
      color_hex,
      image_url,
      season,
      occasions,
      is_favorite,
      purchased_product_id,
      order_id,
      is_purchased,
      purchase_date
    )
    SELECT
      NEW.user_id,
      p.title AS name,
      p.category,
      COALESCE(p.brand, '') AS brand,
      '#000000' AS color_hex,
      p.images[1] AS image_url,
      ARRAY['All Season'] AS season,
      ARRAY['Casual'] AS occasions,
      false AS is_favorite,
      oi.product_id AS purchased_product_id,
      NEW.id AS order_id,
      true AS is_purchased,
      NOW() AS purchase_date
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = NEW.id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_add_to_wardrobe_on_delivery ON orders;

CREATE TRIGGER trigger_add_to_wardrobe_on_delivery
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION add_purchased_items_to_wardrobe();

-- ==========================================
-- 6. TRIGGER: Validate outfit products belong to seller
-- ==========================================
CREATE OR REPLACE FUNCTION validate_outfit_products()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if product belongs to the outfit's seller
  IF NOT EXISTS (
    SELECT 1 FROM outfit_collections oc
    JOIN products p ON p.seller_id = oc.seller_id
    WHERE oc.id = NEW.outfit_id AND p.id = NEW.product_id
  ) THEN
    RAISE EXCEPTION 'Product does not belong to outfit seller';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_outfit_products ON outfit_items;

CREATE TRIGGER trigger_validate_outfit_products
BEFORE INSERT OR UPDATE ON outfit_items
FOR EACH ROW
EXECUTE FUNCTION validate_outfit_products();

-- ==========================================
-- 7. TRIGGER: Deactivate outfit if too few items
-- ==========================================
CREATE OR REPLACE FUNCTION check_outfit_items_count()
RETURNS TRIGGER AS $$
BEGIN
  -- If outfit has less than 2 items after deletion, mark as inactive
  UPDATE outfit_collections
  SET is_active = false
  WHERE id = OLD.outfit_id
  AND (SELECT COUNT(*) FROM outfit_items WHERE outfit_id = OLD.outfit_id) < 2;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_outfit_items ON outfit_items;

CREATE TRIGGER trigger_check_outfit_items
AFTER DELETE ON outfit_items
FOR EACH ROW
EXECUTE FUNCTION check_outfit_items_count();

-- ==========================================
-- 8. MIGRATION: Mark existing clothes as legacy
-- ==========================================
UPDATE clothes
SET is_purchased = false
WHERE purchased_product_id IS NULL AND is_purchased IS NULL;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
-- Next steps:
-- 1. Create Supabase storage bucket: 'outfit-images'
-- 2. Set bucket policy to public read
-- 3. Test trigger with a sample order
