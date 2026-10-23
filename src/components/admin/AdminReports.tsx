import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingBag, MapPin, Coins, Trophy, Scale, Recycle, UserCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tx = { user_id: string; type: string; amount: number; category: string; material: string | null; weight_kg: number | null; created_at: string };

// Busca paginada para não ficar limitado às 1000 linhas padrão
const fetchAll = async <T,>(build: (from: number, to: number) => any): Promise<T[]> => {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
};

const monthKey = (d: string) => d.slice(0, 7);
const monthLabel = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });
};
const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });

const AdminReports = () => {
  const [period, setPeriod] = useState("all");

  const { data } = useQuery({
    queryKey: ["admin-reports-v2"],
    queryFn: async () => {
      const [profiles, products, points, txs] = await Promise.all([
        fetchAll<any>((f, t) => supabase.from("profiles").select("user_id, full_name, balance, is_active").range(f, t)),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("collection_points").select("id", { count: "exact", head: true }).eq("active", true),
        fetchAll<Tx>((f, t) =>
          supabase.from("transactions").select("user_id, type, amount, category, material, weight_kg, created_at").range(f, t)
        ),
      ]);
      return { profiles, productCount: products.count ?? 0, pointCount: points.count ?? 0, txs };
    },
  });

  const months = useMemo(() => {
    const s = new Set((data?.txs ?? []).map((t) => monthKey(t.created_at)));
    s.add(new Date().toISOString().slice(0, 7));
    return [...s].sort().reverse();
  }, [data]);

  const view = useMemo(() => {
    const txs = (data?.txs ?? []).filter((t) => period === "all" || monthKey(t.created_at) === period);
    const names = new Map((data?.profiles ?? []).map((p: any) => [p.user_id, p.full_name || "Sem nome"]));
    const recycling = txs.filter((t) => t.weight_kg && Number(t.weight_kg) > 0);

    const byUser = new Map<string, { kg: number; fc: number; count: number }>();
    const byMaterial = new Map<string, number>();
    for (const t of recycling) {
      const u = byUser.get(t.user_id) ?? { kg: 0, fc: 0, count: 0 };
      u.kg += Number(t.weight_kg);
      if (t.type === "credit") u.fc += Number(t.amount);
      u.count++;
      byUser.set(t.user_id, u);
      const m = t.material || "Outros";
      byMaterial.set(m, (byMaterial.get(m) ?? 0) + Number(t.weight_kg));
    }
    const ranking = [...byUser.entries()]
      .map(([id, v]) => ({ id, name: names.get(id) ?? "Usuário removido", ...v }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 20);
    const totalKg = recycling.reduce((s, t) => s + Number(t.weight_kg), 0);
    const materials = [...byMaterial.entries()].sort((a, b) => b[1] - a[1]);
    const credits = txs.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
    const debits = txs.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
    const redemptions = txs.filter((t) => t.type === "debit" && t.category === "resgate").length;
    return { ranking, totalKg, materials, credits, debits, redemptions, recyclers: byUser.size, txCount: txs.length };
  }, [data, period]);

  const totalBalance = (data?.profiles ?? []).reduce((s: number, p: any) => s + Number(p.balance), 0);
  const activeUsers = (data?.profiles ?? []).filter((p: any) => p.is_active).length;

  const cards = [
    { label: "Usuários Cadastrados", value: data?.profiles.length ?? 0, sub: `${activeUsers} ativos`, icon: Users },
    { label: "Produtos Ativos", value: data?.productCount ?? 0, icon: ShoppingBag },
    { label: "Pontos de Coleta", value: data?.pointCount ?? 0, icon: MapPin },
    { label: "Saldo em Circulação", value: `${fmt(totalBalance, 2)} FC`, sub: "todos os usuários", icon: Coins },
  ];
  const periodCards = [
    { label: "Reciclado", value: `${fmt(view.totalKg)} kg`, icon: Scale },
    { label: "Recicladores", value: view.recyclers, icon: UserCheck },
    { label: "FC Creditado / Debitado", value: `+${fmt(view.credits, 2)} / -${fmt(view.debits, 2)}`, icon: Coins },
    { label: "Resgates", value: view.redemptions, sub: `${view.txCount} transações`, icon: ShoppingBag },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{c.value}</p>
            {c.sub && <p className="text-xs text-muted-foreground">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Período</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Total (todo o período)</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m} className="capitalize">{monthLabel(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {periodCards.map((c) => (
          <div key={c.label} className="rounded-xl bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{c.value}</p>
            {c.sub && <p className="text-xs text-muted-foreground">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-card p-6 shadow-card lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <Trophy className="h-5 w-5 text-primary" /> Melhores Recicladores
          </h3>
          {view.ranking.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma reciclagem registrada neste período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Nome</th>
                    <th className="py-2 pr-2 text-right">Reciclado</th>
                    <th className="py-2 pr-2 text-right">FC ganhos</th>
                    <th className="py-2 text-right">Entregas</th>
                  </tr>
                </thead>
                <tbody>
                  {view.ranking.map((r, i) => (
                    <tr key={r.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-2 font-semibold text-foreground">
                        {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                      </td>
                      <td className="py-2 pr-2 text-foreground">{r.name}</td>
                      <td className="py-2 pr-2 text-right tabular-nums font-medium text-foreground">{fmt(r.kg)} kg</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-primary">{fmt(r.fc, 2)}</td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-card p-6 shadow-card">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <Recycle className="h-5 w-5 text-primary" /> Por Material
          </h3>
          {view.materials.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <div className="space-y-3">
              {view.materials.map(([m, kg]) => {
                const pct = view.totalKg ? (kg / view.totalKg) * 100 : 0;
                return (
                  <div key={m}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize text-foreground">{m}</span>
                      <span className="tabular-nums text-muted-foreground">{fmt(kg)} kg · {fmt(pct, 0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
