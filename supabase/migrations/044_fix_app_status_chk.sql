-- 044 — Fix seller_applications status check constraint to include 'submitted' and 'test'
ALTER TABLE public.seller_applications DROP CONSTRAINT IF EXISTS seller_app_status_chk;
ALTER TABLE public.seller_applications ADD CONSTRAINT seller_app_status_chk
  CHECK (status IN ('submitted', 'pending', 'approved', 'rejected', 'under_review', 'test'));
