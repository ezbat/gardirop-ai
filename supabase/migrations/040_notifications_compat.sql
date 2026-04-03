-- ═══════════════════════════════════════════════════════════
-- 040 — Notifications backward compatibility
-- Adds 'message' column if missing (old triggers reference it).
-- Also adds 'title' and 'body' if they're missing (new code uses them).
-- This ensures both old triggers and new app code work.
-- ═══════════════════════════════════════════════════════════

-- Add message column if it doesn't exist (old triggers use it)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';

-- Add title column if it doesn't exist (new code uses it)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';

-- Add body column if it doesn't exist (new code uses it)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body TEXT DEFAULT '';

-- Add other columns that new code expects
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_type TEXT DEFAULT 'customer';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS admin_scope BOOLEAN DEFAULT FALSE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_type TEXT;

-- Make seller_applications.user_id nullable (guest applications are allowed)
ALTER TABLE public.seller_applications ALTER COLUMN user_id DROP NOT NULL;
