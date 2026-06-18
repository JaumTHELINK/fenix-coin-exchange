-- ============================================================
-- HARDENING DE SEGURANÇA (OWASP A01 Broken Access Control / A04 Insecure Design)
-- ============================================================

-- 1) STORAGE: escopar gravação de imagens de produto à pasta da PRÓPRIA loja.
--    Antes, qualquer lojista podia sobrescrever/apagar imagens de QUALQUER loja.
DROP POLICY IF EXISTS "Store owners can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can delete product images" ON storage.objects;

CREATE POLICY "Store owners can upload own store product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND public.owns_store(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
);

CREATE POLICY "Store owners can update own store product images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.owns_store(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
)
WITH CHECK (
  bucket_id = 'product-images'
  AND public.owns_store(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
);

CREATE POLICY "Store owners can delete own store product images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.owns_store(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
);

-- 2) FUNÇÕES PRIVILEGIADAS: remover EXECUTE de clientes (anon/authenticated).
--    Estas funções SECURITY DEFINER não devem ser chamáveis via API pelo cliente.
--    Funções de gatilho ainda disparam normalmente; manutenção/financeiro fica só para service_role.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_financial_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_financial_fields_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_pending_earnings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_pending_if_due() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_orders() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.release_pending_earnings() TO service_role;
GRANT EXECUTE ON FUNCTION public.release_pending_if_due() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_orders() TO service_role;