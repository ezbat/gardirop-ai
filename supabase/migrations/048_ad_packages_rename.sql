-- 048: Rename ad packages to Starter / Boost / Spotlight
-- Also update pricing and features to match WEARO brand

-- Clear existing packages and re-seed with correct names
DELETE FROM ad_packages;

INSERT INTO ad_packages (name, name_de, description, description_de, price_cents, duration_days, impressions_limit, features, is_active, sort_order) VALUES
(
  'Starter',
  'Starter',
  'Get started with your first promotion. Your post appears in the feed with a subtle promoted badge.',
  'Starte mit deiner ersten Promotion. Dein Beitrag erscheint im Feed mit einem dezenten Promoted-Badge.',
  1999,
  7,
  5000,
  '{"feed_placement": true, "homepage_placement": false, "badge": "promoted", "analytics": false}'::jsonb,
  true,
  1
),
(
  'Boost',
  'Boost',
  'Boost your reach significantly. Priority placement in feed and explore. Ideal for product launches.',
  'Steigere deine Reichweite deutlich. Prioritäts-Platzierung im Feed und Explore. Ideal für Produkt-Launches.',
  4999,
  14,
  15000,
  '{"feed_placement": true, "homepage_placement": true, "badge": "boosted", "analytics": true}'::jsonb,
  true,
  2
),
(
  'Spotlight',
  'Spotlight',
  'Maximum visibility. Featured on homepage, top of feed, and explore highlights. For serious growth.',
  'Maximale Sichtbarkeit. Featured auf der Startseite, oben im Feed und Explore-Highlights. Für ernsthaftes Wachstum.',
  9999,
  30,
  -1,
  '{"feed_placement": true, "homepage_placement": true, "badge": "spotlight", "analytics": true, "featured_badge": true}'::jsonb,
  true,
  3
);
