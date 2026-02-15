-- TEMPORARY FIX: Allow all authenticated users to do everything
-- (Sadece test için, production'da kullanmayın!)

DROP POLICY IF EXISTS "Temp allow all" ON storage.objects;

CREATE POLICY "Temp allow all"
ON storage.objects
TO authenticated
USING (bucket_id = 'videos')
WITH CHECK (bucket_id = 'videos');
