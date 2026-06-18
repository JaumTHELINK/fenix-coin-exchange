import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Threshold = {
  metric_key: string;
  label: string;
  unit: string;
  direction: "above" | "below";
  warn_value: number;
  crit_value: number;
  enabled: boolean;
};

function metricValue(metrics: any, key: string): number | null {
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
      return null;
  }
}

function crossed(value: number, limit: number, direction: string): boolean {
  return direction === "below" ? value < limit : value > limit;
}

async function sendEmail(
  recipients: string[],
  subject: string,
  html: string,
): Promise<boolean> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY || recipients.length === 0) {
    return false;
  }
  try {
    const res = await fetch(
      "https://connector-gateway.lovable.dev/resend/emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: "Ecoteiner Monitor <onboarding@resend.dev>",
          to: recipients,
          subject,
          html,
        }),
      },
    );
    if (!res.ok) {
      console.error("Email send failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("Email send error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: metrics, error: mErr } = await supabase.rpc(
      "_compute_db_metrics",
    );
    if (mErr) throw mErr;

    const { data: thresholds, error: tErr } = await supabase
      .from("monitoring_thresholds")
      .select("*")
      .eq("enabled", true);
    if (tErr) throw tErr;

    const newAlerts: Array<{
      metric_key: string;
      label: string;
      level: "warning" | "critical";
      value: number;
      threshold: number;
      message: string;
    }> = [];

    for (const t of (thresholds ?? []) as Threshold[]) {
      const value = metricValue(metrics, t.metric_key);
      if (value === null) continue;

      let level: "warning" | "critical" | null = null;
      let limit = 0;
      if (crossed(value, t.crit_value, t.direction)) {
        level = "critical";
        limit = t.crit_value;
      } else if (crossed(value, t.warn_value, t.direction)) {
        level = "warning";
        limit = t.warn_value;
      }
      if (!level) continue;

      // Dedupe: skip if same metric+level alert in the last 60 minutes
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("monitoring_alerts")
        .select("id", { count: "exact", head: true })
        .eq("metric_key", t.metric_key)
        .eq("level", level)
        .gte("created_at", since);
      if ((count ?? 0) > 0) continue;

      const arrow = t.direction === "below" ? "abaixo de" : "acima de";
      newAlerts.push({
        metric_key: t.metric_key,
        label: t.label,
        level,
        value,
        threshold: limit,
        message: `${t.label} está em ${value}${t.unit} (${arrow} ${limit}${t.unit}).`,
      });
    }

    let emailed = false;
    if (newAlerts.length > 0) {
      const { data: inserted } = await supabase
        .from("monitoring_alerts")
        .insert(newAlerts)
        .select("id");

      // Collect admin emails
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const adminIds = (admins ?? []).map((a) => a.user_id);
      let recipients: string[] = [];
      if (adminIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("email")
          .in("user_id", adminIds);
        recipients = (profs ?? [])
          .map((p) => p.email)
          .filter((e): e is string => !!e && e.includes("@"));
      }

      const critical = newAlerts.some((a) => a.level === "critical");
      const subject = `${critical ? "🔴 CRÍTICO" : "🟡 Atenção"} — Monitoramento Ecoteiner`;
      const rows = newAlerts
        .map(
          (a) =>
            `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${
              a.level === "critical" ? "🔴" : "🟡"
            } ${a.label}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb"><b>${a.value}</b></td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">limite ${a.threshold}</td></tr>`,
        )
        .join("");
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#059669">Alerta de Monitoramento</h2>
          <p>Uma ou mais métricas do banco de dados cruzaram o limite configurado:</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
          <p style="color:#6b7280;font-size:12px;margin-top:16px">Verificado em ${new Date().toLocaleString("pt-BR")}. Acesse o Painel Administrativo › Monitoramento para detalhes.</p>
        </div>`;

      emailed = await sendEmail(recipients, subject, html);
      if (emailed && inserted) {
        await supabase
          .from("monitoring_alerts")
          .update({ notified: true })
          .in("id", inserted.map((i) => i.id));
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        metrics,
        new_alerts: newAlerts.length,
        emailed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("monitor-check error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});