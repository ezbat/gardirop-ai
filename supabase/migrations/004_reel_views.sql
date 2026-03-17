-- =====================================================
-- Migration 004: Real View Tracking with Dedup
-- =====================================================

-- Deduped view tracking table
DROP TABLE IF EXISTS reel_views CASCADE;
CREATE TABLE reel_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  viewer_id TEXT,
  viewer_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent same user viewing same reel multiple times
CREATE UNIQUE INDEX idx_reel_views_user ON reel_views(post_id, viewer_id) WHERE viewer_id IS NOT NULL;
-- Prevent same anonymous IP viewing same reel multiple times
CREATE UNIQUE INDEX idx_reel_views_ip ON reel_views(post_id, viewer_ip) WHERE viewer_id IS NULL AND viewer_ip IS NOT NULL;
-- Fast lookups by post
CREATE INDEX idx_reel_views_post ON reel_views(post_id);

-- RLS
ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access on reel_views" ON reel_views;
  CREATE POLICY "Service role full access on reel_views" ON reel_views
    FOR ALL TO service_role USING (true) WITH CHECK (true);
END $$;

-- Atomic view recording with dedup
CREATE OR REPLACE FUNCTION record_reel_view(
  p_post_id TEXT,
  p_viewer_id TEXT DEFAULT NULL,
  p_viewer_ip TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_inserted BOOLEAN := FALSE;
  v_new_count INTEGER;
BEGIN
  BEGIN
    IF p_viewer_id IS NOT NULL THEN
      INSERT INTO reel_views (post_id, viewer_id) VALUES (p_post_id, p_viewer_id);
    ELSIF p_viewer_ip IS NOT NULL THEN
      INSERT INTO reel_views (post_id, viewer_ip) VALUES (p_post_id, p_viewer_ip);
    ELSE
      INSERT INTO reel_views (post_id) VALUES (p_post_id);
    END IF;
    v_inserted := TRUE;
  EXCEPTION WHEN unique_violation THEN
    v_inserted := FALSE;
  END;

  IF v_inserted THEN
    UPDATE posts SET view_count = view_count + 1 WHERE id = p_post_id
    RETURNING view_count INTO v_new_count;
  ELSE
    SELECT view_count INTO v_new_count FROM posts WHERE id = p_post_id;
  END IF;

  RETURN json_build_object('recorded', v_inserted, 'view_count', COALESCE(v_new_count, 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
