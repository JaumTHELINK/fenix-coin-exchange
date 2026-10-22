import type { Database } from "@/integrations/supabase/types";

export type SystemOrder = Database["public"]["Tables"]["system_orders"]["Row"];
export type OrderGroup = "pending" | "received" | "archived";

export function orderGroup(order: Pick<SystemOrder, "status" | "updated_at">, now = Date.now()): OrderGroup {
  if (order.status !== "entregue" && order.status !== "cancelado") return "pending";
  return now - new Date(order.updated_at).getTime() > 24 * 60 * 60 * 1000 ? "archived" : "received";
}

export function matchesOrderFilters(order: SystemOrder, filters: { date: string; client: string; product: string; status: string }) {
  const date = new Date(order.created_at);
  const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return (!filters.date || localDate === filters.date)
    && (!filters.client || (order.customer_name ?? "").toLocaleLowerCase("pt-BR").includes(filters.client.toLocaleLowerCase("pt-BR")))
    && (!filters.product || order.product_name.toLocaleLowerCase("pt-BR").includes(filters.product.toLocaleLowerCase("pt-BR")))
    && (!filters.status || order.status === filters.status);
}