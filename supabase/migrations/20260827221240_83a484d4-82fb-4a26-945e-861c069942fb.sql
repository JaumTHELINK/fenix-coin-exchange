-- owns_store só é usada em policies restritas a usuários autenticados:
-- visitantes anônimos não precisam (nem devem) poder sondá-la.
REVOKE EXECUTE ON FUNCTION public.owns_store(uuid, uuid) FROM anon;