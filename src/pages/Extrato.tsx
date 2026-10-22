import { useState, useMemo } from "react";
import { Search, Download, ArrowUpCircle, ArrowDownCircle, Wallet, DollarSign, CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const Extrato = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("Todos");
  const [categoria, setCategoria] = useState("Todas");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch = t.description.toLowerCase().includes(search.toLowerCase());
      const matchType = tipo === "Todos" || (tipo === "Recebido" && t.type === "credit") || (tipo === "Gasto" && t.type === "debit");
      const matchCat = categoria === "Todas" || t.category === categoria.toLowerCase();
      const txDate = new Date(t.created_at);
      const matchFrom = !dateFrom || !isBefore(txDate, startOfDay(dateFrom));
      const matchTo = !dateTo || !isAfter(txDate, endOfDay(dateTo));
      return matchSearch && matchType && matchCat && matchFrom && matchTo;
    });
  }, [transactions, search, tipo, categoria, dateFrom, dateTo]);

  const totalReceived = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
  const totalSpent = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
  const currentBalance = totalReceived - totalSpent;

  const hasDateFilter = dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Extrato de Transações</h1>
        <p className="text-sm text-muted-foreground">Acompanhe todas as suas movimentações de Fênix Coins</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl bg-card p-5 shadow-card">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
            <ArrowUpCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Recebido</p>
            <p className="text-xl font-bold text-primary tabular-nums">+{totalReceived} FC</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-card p-5 shadow-card">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <ArrowDownCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Gasto</p>
            <p className="text-xl font-bold text-destructive tabular-nums">-{totalSpent} FC</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-card p-5 shadow-card">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo Atual</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{currentBalance} FC</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-card p-6 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">🔍 Filtros</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por descrição..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Tipo</label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option>Todos</option>
              <option>Recebido</option>
              <option>Gasto</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Categoria</label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option>Todas</option>
              <option>Reciclagem</option>
              <option>Troca</option>
              <option>Bônus</option>
              <option>Resgate</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="mb-1 block text-sm font-medium text-foreground">Período</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left font-normal text-xs", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dateFrom ? format(dateFrom, "dd/MM/yy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left font-normal text-xs", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dateTo ? format(dateTo, "dd/MM/yy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            {hasDateFilter && (
              <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                Limpar datas
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Histórico de Transações</h2>
            <p className="text-xs text-muted-foreground">{filtered.length} transação(ões) encontrada(s)</p>
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            <Download className="h-4 w-4" /> Exportar
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma transação encontrada</p>
            <p className="text-xs text-muted-foreground">Você ainda não possui transações registradas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${t.type === "credit" ? "bg-accent" : "bg-destructive/10"}`}>
                    {t.type === "credit" ? <ArrowUpCircle className="h-4 w-4 text-primary" /> : <ArrowDownCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold tabular-nums ${t.type === "credit" ? "text-primary" : "text-destructive"}`}>
                  {t.type === "credit" ? "+" : "-"}{Number(t.amount)} FC
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Extrato;
