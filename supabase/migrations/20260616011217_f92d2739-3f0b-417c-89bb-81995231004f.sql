REVOKE EXECUTE ON FUNCTION public.release_pending_earnings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_pending_if_due() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_fifth_business_day(date) FROM PUBLIC, anon, authenticated;