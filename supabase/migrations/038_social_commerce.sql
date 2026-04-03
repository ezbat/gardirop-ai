-- ═══════════════════════════════════════════════════════════
-- 038 — Social Commerce Foundation
-- Seller-only posting, advertising, verification audit trail
-- ═══════════════════════════════════════════════════════════

-- ─── Extend posts table for seller content ──────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(20) DEFAULT 'image';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS linked_product_ids UUID[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS engagement_score FLOAT DEFAULT 0;

-- ─── Extend sellers table ───────────────────────────────────
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0;

-- ─── Ad packages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_de VARCHAR(100) NOT NULL,
  description TEXT,
  description_de TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  impressions_limit INTEGER,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Ad applications ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES ad_packages(id),
  post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','active','completed','cancelled')),
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  impressions_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seller verification audit log ──────────────────────────
CREATE TABLE IF NOT EXISTS seller_verification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('granted','revoked')),
  reason TEXT,
  admin_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_seller_id ON posts(seller_id) WHERE seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_engagement ON posts(engagement_score DESC) WHERE seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_ad_applications_seller ON ad_applications(seller_id);
CREATE INDEX IF NOT EXISTS idx_ad_applications_status ON ad_applications(status);

-- ─── Seed default ad packages ───────────────────────────────
INSERT INTO ad_packages (name, name_de, description, description_de, price_cents, duration_days, impressions_limit, features, sort_order) VALUES
  ('Basic', 'Basis', 'Boost one post in the feed for 7 days', 'Einen Beitrag 7 Tage im Feed hervorheben', 1999, 7, 5000, '{"priority_feed": true}', 1),
  ('Premium', 'Premium', 'Featured placement + extended reach for 14 days', 'Hervorgehobene Platzierung + erweiterte Reichweite für 14 Tage', 4999, 14, 15000, '{"priority_feed": true, "banner_slot": true, "analytics": true}', 2),
  ('Enterprise', 'Enterprise', 'Maximum visibility for 30 days with dedicated support', 'Maximale Sichtbarkeit für 30 Tage mit persönlichem Support', 9999, 30, NULL, '{"priority_feed": true, "banner_slot": true, "analytics": true, "dedicated_support": true, "unlimited_impressions": true}', 3)
ON CONFLICT DO NOTHING;
