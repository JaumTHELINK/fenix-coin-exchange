import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  Database,
  Timer,
  MemoryStick,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Threshold = {
  id: string;
  metric_key: string;
  label: string;
  unit: string;
  direction: "above" | "below";
  warn_value: number;
  crit_value: number;
  enabled: boolean;
};

type AlertRow = {
  id: string;
  label: string;
  level: "warning" | "critical";
  value: number;
  threshold: number;
  message: string;
  notified: boolean;
  created_at: string;
};

const ICONS: Record<string, typeof Activity> = {
  connections_pct: Activity,
  db_size_mb: Database,
  latency_ms: Timer,
  cache_hit_ratio: MemoryStick,
};

function metricValue(metrics: any, key: string): number {
  switch (key) {
    case "connections_pct":
      return Number(metrics?.connections?.pct ?? 0);
    case "db_size_mb":
      return Number(metrics?.db_size?.mb ?? 0);
    case "latency_ms":
      return Number(metrics?.latency?.mean_ms ?? 0);
    case "cache_hit_ratio":
      return Number(metrics?.cache_hit_ratio ?? 0);
    default:
      return 0;
  }
}

function statusOf(value: number, t: Threshold): "ok" | "warning" | "critical" {
  const crossed = (limit: number) =>
    t.direction === "below" ? value < limit : value > limit;
  if (crossed(t.crit_value)) return "critical";
  if (crossed(t.warn_value)) return "warning";
  return "ok";
}

const STATUS_STYLES: Record<string, string> = {
  ok: "border-primary/30 bg-primary/5",
  warning: "border-amber-500/40 bg-amber-500/5",
  critical: "border-destructive/50 bg-destructive/5",
};

const STATUS_DOT: Record<string, string> = {
  ok: "bg-primary",
  warning: "bg-amber-500",
  critical: "bg-destructive",
};

const STATUS_LABEL: Record<string, string> = {
  ok: "Normal",
  warning: "Atenção",
  critical: "Crítico",
};

const AdminMonitoring = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ warn: string; crit: string }>({
    warn: "",
    crit: "",
  });

  const { data: metrics, isFetching, refetch } = useQuery({
    queryKey: ["db-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_db_metrics");
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 30000,
  });

  const { data: thresholds } = useQuery({
    queryKey: ["monitoring-thresholds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monitoring_thresholds")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as Threshold[];
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["monitoring-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monitoring_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as AlertRow[];
    },
    refetchInterval: 60000,
  });

  const saveThreshold = useMutation({
    mutationFn: async (vars: { id: string; warn: number; crit: number }) => {
      const { error } = await supabase
        .from("monitoring_thresholds")
        .update({ warn_value: vars.warn, crit_value: vars.crit })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoring-thresholds"] });
      setEditing(null);
      toast({ title: "Limites atualizados" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const runCheck = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("monitor-check");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["monitoring-alerts"] });
      refetch();
      toast({
        title: "Verificação concluída",
        description:
          data?.new_alerts > 0
            ? `${data.new_alerts} novo(s) alerta(s).${data.emailed ? " E-mail enviado." : ""}`
            : "Nenhum limite ultrapassado.",
      });
    },
    onError: (e: any) =>
      toast({ title: "Erro na verificação", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Atualiza automaticamente a cada 30s. Os limites disparam alertas e e-mail aos administradores.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Atualizar
          </button>
          <button
            onClick={() => runCheck.mutate()}
            disabled={runCheck.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Activity className="h-4 w-4" />
            Verificar agora
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(thresholds ?? []).map((t) => {
          const value = metricValue(metrics, t.metric_key);
          const status = statusOf(value, t);
          const Icon = ICONS[t.metric_key] ?? Activity;
          const isEditing = editing === t.id;
          return (
            <div
              key={t.id}
              className={cn("rounded-xl border p-5 shadow-card", STATUS_STYLES[status])}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} />
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {metrics ? `${value}${t.unit}` : "—"}
              </p>

              {isEditing ? (
                <div className="mt-3 space-y-2">
                  <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    Atenção
                    <input
                      type="number"
                      value={draft.warn}
                      onChange={(e) => setDraft((d) => ({ ...d, warn: e.target.value }))}
                      className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-sm text-foreground"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    Crítico
                    <input
                      type="number"
                      value={draft.crit}
                      onChange={(e) => setDraft((d) => ({ ...d, crit: e.target.value }))}
                      className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-sm text-foreground"
                    />
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() =>
                        saveThreshold.mutate({
                          id: t.id,
                          warn: Number(draft.warn),
                          crit: Number(draft.crit),
                        })
                      }
                      className="flex flex-1 items-center justify-center gap-1 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
                    >
                      <Save className="h-3 w-3" /> Salvar
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="flex items-center justify-center rounded border border-border px-2 py-1 text-xs"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t.direction === "below" ? "min" : "máx"} {t.warn_value}{t.unit} / {t.crit_value}{t.unit}
                  </span>
                  <button
                    onClick={() => {
                      setEditing(t.id);
                      setDraft({ warn: String(t.warn_value), crit: String(t.crit_value) });
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Alerts history */}
      <div className="rounded-xl bg-card p-6 shadow-card">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          Histórico de Alertas
        </h3>
        {(alerts ?? []).length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Nenhum alerta registrado. Tudo dentro dos limites.
          </div>
        ) : (
          <ul className="space-y-2">
            {(alerts ?? []).map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      a.level === "critical" ? "bg-destructive" : "bg-amber-500",
                    )}
                  />
                  <div>
                    <p className="text-foreground">{a.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                      {a.notified ? " · e-mail enviado" : ""}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminMonitoring;