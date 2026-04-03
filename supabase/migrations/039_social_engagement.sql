-- ═══════════════════════════════════════════════════════════
-- 039 — Social Engagement: Comments, Follow refinement,
--       Ad package rename (Starter/Boost/Spotlight)
-- ═══════════════════════════════════════════════════════════

-- ─── Comments table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

-- ─── Likes table (ensure exists) ─────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);

-- ─── Store followers (seller follow, ensure exists) ──────
CREATE TABLE IF NOT EXISTS store_followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_store_followers_seller ON store_followers(seller_id);
CREATE INDEX IF NOT EXISTS idx_store_followers_user ON store_followers(user_id);

-- ─── Update ad packages to Starter / Boost / Spotlight ───
UPDATE ad_packages SET
  name = 'Starter', name_de = 'Starter',
  description = 'Boost one post in the feed for 7 days',
  description_de = 'Einen Beitrag 7 Tage im Feed hervorheben',
  features = '{"priority_feed": true}'
WHERE sort_order = 1;

UPDATE ad_packages SET
  name = 'Boost', name_de = 'Boost',
  description = 'Featured placement + extended reach for 14 days',
  description_de = 'Hervorgehobene Platzierung + erweiterte Reichweite für 14 Tage',
  features = '{"priority_feed": true, "banner_slot": true, "analytics": true}'
WHERE sort_order = 2;

UPDATE ad_packages SET
  name = 'Spotlight', name_de = 'Spotlight',
  description = 'Maximum visibility for 30 days with homepage placement',
  description_de = 'Maximale Sichtbarkeit für 30 Tage mit Homepage-Platzierung',
  features = '{"priority_feed": true, "banner_slot": true, "analytics": true, "homepage_slot": true, "unlimited_impressions": true}'
WHERE sort_order = 3;
