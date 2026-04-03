-- 042 — Fix NOT NULL constraints that block inserts

-- notifications: old triggers don't set these columns, so they must be nullable or have defaults
ALTER TABLE public.notifications ALTER COLUMN recipient_type SET DEFAULT 'customer';
-- Force existing NOT NULL to drop if it exists
DO $$ BEGIN
  ALTER TABLE public.notifications ALTER COLUMN recipient_type DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Also ensure title, body, message have proper defaults and are nullable
DO $$ BEGIN ALTER TABLE public.notifications ALTER COLUMN title DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.notifications ALTER COLUMN body DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.notifications ALTER COLUMN message DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.notifications ALTER COLUMN image_url DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;

-- seller_applications: make shop_name nullable (API uses store_name, not shop_name)
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN shop_name DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN user_id DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
