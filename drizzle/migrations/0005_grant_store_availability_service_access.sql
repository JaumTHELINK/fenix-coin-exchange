GRANT EXECUTE ON FUNCTION public.is_store_available(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.available_partner_store_ids() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_partner_order_availability() TO service_role;