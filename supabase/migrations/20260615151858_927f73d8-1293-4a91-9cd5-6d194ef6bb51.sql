CREATE POLICY "Store owners can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (SELECT 1 FROM public.stores WHERE owner_id = auth.uid())
);

CREATE POLICY "Store owners can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (SELECT 1 FROM public.stores WHERE owner_id = auth.uid())
);

CREATE POLICY "Store owners can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (SELECT 1 FROM public.stores WHERE owner_id = auth.uid())
);