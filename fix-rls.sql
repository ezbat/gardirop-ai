-- ===================================
-- Supabase Storage RLS Politikaları
-- videos bucket için
-- ===================================

-- Önce tüm mevcut politikaları sil
DROP POLICY IF EXISTS "Users can upload their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Public videos are viewable" ON storage.objects;

-- YENİ POLİTİKALAR
-- 1. Herkes videolarını görebilir (SELECT)
CREATE POLICY "Public can view videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

-- 2. Authenticated kullanıcılar kendi klasörlerine upload yapabilir (INSERT)
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Kullanıcılar kendi videolarını silebilir (DELETE)
CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Kullanıcılar kendi videolarını güncelleyebilir (UPDATE)
CREATE POLICY "Users can update own videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
