-- 043 — Make optional seller_application fields nullable
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN phone DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN legal_full_name DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN date_of_birth DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN residence_country DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN company_name DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN company_reg_number DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN vat_id DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN company_address DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN business_type DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN brand_name DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN website_url DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN social_links DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN estimated_monthly_orders DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN avg_order_value DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN product_origin_detail DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.seller_applications ALTER COLUMN return_address DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
