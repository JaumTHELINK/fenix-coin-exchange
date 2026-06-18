CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cleanup_old_orders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM public.orders
    WHERE created_at < now() - interval '2 years'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;
  RETURN v_count;
END;
$function$;

-- Remove agendamento anterior, se existir, e cria um novo (diário às 03:00 UTC)
SELECT cron.unschedule('cleanup-old-orders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-orders');

SELECT cron.schedule(
  'cleanup-old-orders',
  '0 3 * * *',
  $$SELECT public.cleanup_old_orders();$$
);