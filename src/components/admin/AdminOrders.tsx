import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Check, ClipboardList, Loader2, Phone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { matchesOrderFilters, orderGroup, type SystemOrder, type OrderGroup } from "@/lib/orders";

const AdminOrders = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ date: "", client: "", product: "", status: "" });
  const [showArchived, setShowArchived] = useState(false);
  const [action, setAction] = useState<{ order: SystemOrder; status: "entregue" | "cancelado" } | null>(null);
  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-system-orders", user?.id],
    enabled: !!user && isAdmin,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("system_orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const processOrder = useMutation({
    mutationFn: async (selected: NonNullable<typeof action>) => {
      const { error } = await supabase.rpc("process_system_order", { _order_id: selected.order.id, _status: selected.status });
      if (error) throw error;
    },
    onSuccess: (_, selected) => {
      for (const key of ["admin-system-orders", "profile", "products", "product", "admin-products-all", "transactions", "admin-transactions"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      setAction(null);
      toast({ title: selected.status === "cancelado" ? "Pedido cancelado" : "Pedido aprovado", description: selected.status === "cancelado" ? "O valor foi devolvido ao cliente e o estoque foi reposto." : "Pedido marcado como entregue." });
    },
    onError: (error: Error) => toast({ title: "Não foi possível atualizar o pedido", description: error.message, variant: "destructive" }),
  });
  const filtered = orders.filter(order => matchesOrderFilters(order, filters));
  const group = (value: OrderGroup) => filtered.filter(order => orderGroup(order) === value);
  const renderTable = (list: SystemOrder[], empty: string) => (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground"><tr>
          {["Data", "Cliente", "Produto", "Qtd", "Total (FC)", "Status"].map(label => <th key={label} className="px-4 py-3 text-left font-medium whitespace-nowrap">{label}</th>)}
        </tr></thead>
        <tbody>{list.map(order => <tr key={order.id} className="border-t border-border">
          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}<span className="block text-xs">#{order.id.slice(0, 8)}</span></td>
          <td className="px-4 py-3"><span className="block font-medium">{order.customer_name || "—"}</span>{order.customer_phone && <a className="inline-flex items-center gap-1 text-xs text-muted-foreground" href={`tel:${order.customer_phone.replace(/\D/g, "")}`}><Phone className="h-3 w-3" />{order.customer_phone}</a>}</td>
          <td className="px-4 py-3">{order.product_name}</td>
          <td className="px-4 py-3 tabular-nums">{order.quantity}</td>
          <td className="px-4 py-3 font-medium tabular-nums whitespace-nowrap">{Number(order.total_fc).toLocaleString("pt-BR")} FC</td>
          <td className="px-4 py-3">{order.status === "pendente" ? <div className="flex gap-2">
            <Button size="sm" onClick={() => setAction({ order, status: "entregue" })} disabled={processOrder.isPending}><Check className="mr-1 h-4 w-4" />Aprovar</Button>
            <Button size="sm" variant="outline" onClick={() => setAction({ order, status: "cancelado" })} disabled={processOrder.isPending}><X className="mr-1 h-4 w-4" />Cancelar</Button>
          </div> : <Badge variant={order.status === "cancelado" ? "destructive" : "secondary"}>{order.status === "cancelado" ? "Cancelado" : "Entregue"}</Badge>}</td>
        </tr>)}{list.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{empty}</td></tr>}</tbody>
      </table>
    </div>
  );
  if (!isAdmin) return null;
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (isError) return <div className="space-y-3"><p className="text-destructive">Não foi possível carregar os pedidos.</p><Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button></div>;
  return <div className="space-y-6">
    <h2 className="text-lg font-semibold text-foreground">Pedidos dos produtos do sistema</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-sm">Data<Input type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} /></label>
      <label className="space-y-1 text-sm">Cliente<Input placeholder="Nome do cliente" value={filters.client} onChange={e => setFilters(f => ({ ...f, client: e.target.value }))} /></label>
      <label className="space-y-1 text-sm">Produto<Input placeholder="Nome do produto" value={filters.product} onChange={e => setFilters(f => ({ ...f, product: e.target.value }))} /></label>
      <div className="space-y-1 text-sm"><span>Status</span><Select value={filters.status || "all"} onValueChange={value => setFilters(f => ({ ...f, status: value === "all" ? "" : value }))}><SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="entregue">Entregue</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent></Select></div>
    </div>
    {Object.values(filters).some(Boolean) && <Button variant="ghost" size="sm" onClick={() => setFilters({ date: "", client: "", product: "", status: "" })}>Limpar filtros</Button>}
    <section className="space-y-3"><h3 className="flex items-center gap-2 font-semibold text-primary"><ClipboardList className="h-5 w-5" />Pedidos pendentes<Badge>{group("pending").length}</Badge></h3>{renderTable(group("pending"), "Nenhum pedido pendente no momento.")}</section>
    <section className="space-y-3"><h3 className="font-semibold text-foreground">Pedidos recebidos <Badge variant="secondary">{group("received").length}</Badge></h3>{renderTable(group("received"), "Nenhum pedido recebido recentemente.")}</section>
    <section className="space-y-3"><Button variant="ghost" onClick={() => setShowArchived(value => !value)}><Archive className="mr-2 h-4 w-4" />{showArchived ? "Ocultar arquivados" : "Ver pedidos arquivados"} ({group("archived").length})</Button>{showArchived && renderTable(group("archived"), "Nenhum pedido arquivado.")}</section>
    <AlertDialog open={!!action} onOpenChange={open => { if (!open && !processOrder.isPending) setAction(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{action?.status === "cancelado" ? "Cancelar pedido?" : "Aprovar pedido?"}</AlertDialogTitle><AlertDialogDescription>{action?.order.quantity}x {action?.order.product_name}. {action?.status === "cancelado" ? "O cliente receberá os Fênix Coins de volta e o estoque será reposto." : "O pedido será marcado como entregue."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={processOrder.isPending}>Voltar</AlertDialogCancel><Button disabled={processOrder.isPending} onClick={() => { if (action) processOrder.mutate(action); }}>{processOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar</Button></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
};
export default AdminOrders;