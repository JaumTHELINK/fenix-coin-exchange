CREATE FUNCTION public.is_store_available(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.stores s JOIN public.profiles p ON p.user_id = s.owner_id WHERE s.id = _store_id AND s.active AND p.is_active);
$$;
REVOKE EXECUTE ON FUNCTION public.is_store_available(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_store_available(uuid) TO authenticated;
ALTER POLICY "Authenticated can view active stores" ON public.stores USING (active AND public.is_store_available(id));
ALTER POLICY "Anyone authenticated can view products" ON public.products USING (active AND (store_id IS NULL OR public.is_store_available(store_id)));
CREATE FUNCTION public.available_partner_store_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT s.id FROM public.stores s JOIN public.profiles p ON p.user_id=s.owner_id WHERE s.active AND p.is_active AND auth.uid() IS NOT NULL;
$$;
REVOKE EXECUTE ON FUNCTION public.available_partner_store_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.available_partner_store_ids() TO authenticated;
CREATE FUNCTION public.guard_partner_order_availability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.is_store_available(NEW.store_id) THEN RAISE EXCEPTION 'Loja ou conta do lojista indisponível'; END IF;
 RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_partner_order_availability() FROM public, anon, authenticated;
CREATE TRIGGER guard_partner_order_availability BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_partner_order_availability();