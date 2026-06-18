-- ============ Monitoring: thresholds, alerts, metrics function ============

-- Thresholds (admin-configurable)
CREATE TABLE public.monitoring_thresholds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_key text NOT NULL UNIQUE,
  label text NOT NULL,
  unit text NOT NULL DEFAULT '',
  direction text NOT NULL DEFAULT 'above' CHECK (direction IN ('above','below')),
  warn_value numeric NOT NULL,
  crit_value numeric NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitoring_thresholds TO authenticated;
GRANT ALL ON public.monitoring_thresholds TO service_role;
ALTER TABLE public.monitoring_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage thresholds"
  ON public.monitoring_thresholds FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_monitoring_thresholds_updated
  BEFORE UPDATE ON public.monitoring_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Alert log
CREATE TABLE public.monitoring_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_key text NOT NULL,
  label text NOT NULL,
  level text NOT NULL CHECK (level IN ('warning','critical')),
  value numeric NOT NULL,
  threshold numeric NOT NULL,
  message text NOT NULL,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_monitoring_alerts_created ON public.monitoring_alerts (created_at DESC);
CREATE INDEX idx_monitoring_alerts_metric ON public.monitoring_alerts (metric_key, level, created_at DESC);

GRANT SELECT ON public.monitoring_alerts TO authenticated;
GRANT ALL ON public.monitoring_alerts TO service_role;
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read alerts"
  ON public.monitoring_alerts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Internal metric computation (no auth check) — restricted to service_role + definer callers
CREATE OR REPLACE FUNCTION public._compute_db_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_active int;
  v_max int;
  v_dbsize bigint;
  v_cache numeric;
  v_lat_mean numeric;
  v_lat_max numeric;
  v_slow int;
BEGIN
  SELECT count(*) INTO v_active FROM pg_stat_activity;
  SELECT setting::int INTO v_max FROM pg_settings WHERE name = 'max_connections';
  SELECT pg_database_size(current_database()) INTO v_dbsize;
  SELECT round(sum(blks_hit) * 100.0 / nullif(sum(blks_hit) + sum(blks_read), 0), 2)
    INTO v_cache FROM pg_stat_database;

  BEGIN
    SELECT round(max(mean_exec_time)::numeric, 2),
           round(max(max_exec_time)::numeric, 2),
           count(*) FILTER (WHERE mean_exec_time > 1000)
      INTO v_lat_mean, v_lat_max, v_slow
      FROM pg_stat_statements
      WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database());
  EXCEPTION WHEN OTHERS THEN
    v_lat_mean := NULL; v_lat_max := NULL; v_slow := 0;
  END;

  RETURN jsonb_build_object(
    'captured_at', now(),
    'connections', jsonb_build_object(
      'active', v_active,
      'max', v_max,
      'pct', round(v_active * 100.0 / nullif(v_max, 0), 1)
    ),
    'db_size', jsonb_build_object(
      'bytes', v_dbsize,
      'mb', round(v_dbsize / 1048576.0, 2),
      'pretty', pg_size_pretty(v_dbsize)
    ),
    'latency', jsonb_build_object(
      'mean_ms', COALESCE(v_lat_mean, 0),
      'max_ms', COALESCE(v_lat_max, 0),
      'slow_count', COALESCE(v_slow, 0)
    ),
    'cache_hit_ratio', COALESCE(v_cache, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public._compute_db_metrics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._compute_db_metrics() TO service_role;

-- Public entry point for the admin dashboard (auth-checked)
CREATE OR REPLACE FUNCTION public.get_db_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN public._compute_db_metrics();
END;
$$;

REVOKE ALL ON FUNCTION public.get_db_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_db_metrics() TO authenticated;

-- Seed default thresholds
INSERT INTO public.monitoring_thresholds (metric_key, label, unit, direction, warn_value, crit_value) VALUES
  ('connections_pct', 'Conexões ativas', '%', 'above', 70, 85),
  ('db_size_mb', 'Tamanho do banco', 'MB', 'above', 2048, 4096),
  ('latency_ms', 'Latência de query (média máx.)', 'ms', 'above', 500, 1000),
  ('cache_hit_ratio', 'Eficiência de memória (cache hit)', '%', 'below', 95, 90);
