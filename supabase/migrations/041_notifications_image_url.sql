-- 041 — Add remaining missing columns to notifications + fix seller_applications.user_id

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_type TEXT;

-- Make seller_applications.user_id nullable (guest applications are allowed)
ALTER TABLE public.seller_applications ALTER COLUMN user_id DROP NOT NULL;
