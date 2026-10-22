CREATE FUNCTION public.sync_store_merchant_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND NEW.active IS DISTINCT FROM OLD.active AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
  RAISE EXCEPTION 'Somente administradores podem ativar ou desativar lojas';
 END IF;
 IF NEW.active THEN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.owner_id, 'lojista') ON CONFLICT (user_id, role) DO NOTHING;
 ELSE
  DELETE FROM public.user_roles WHERE user_id = NEW.owner_id AND role = 'lojista'
  AND NOT EXISTS (SELECT 1 FROM public.stores WHERE owner_id = NEW.owner_id AND active AND id <> NEW.id);
 END IF;
 RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.sync_store_merchant_access() FROM public, anon, authenticated;
CREATE TRIGGER sync_store_merchant_access AFTER INSERT OR UPDATE OF active ON public.stores FOR EACH ROW EXECUTE FUNCTION public.sync_store_merchant_access();