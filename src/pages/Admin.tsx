import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link, useLocation } from "react-router-dom";
import { Users, ShoppingBag, MapPin, Receipt, BarChart3, Settings, Coins, Megaphone, Mail, Store, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminStores from "@/components/admin/AdminStores";
import AdminCollectionPoints from "@/components/admin/AdminCollectionPoints";
import AdminTransactions from "@/components/admin/AdminTransactions";
import AdminReports from "@/components/admin/AdminReports";
import AdminMaterialRates from "@/components/admin/AdminMaterialRates";
import AdminPromotions from "@/components/admin/AdminPromotions";
import AdminContacts from "@/components/admin/AdminContacts";
import AdminMonitoring from "@/components/admin/AdminMonitoring";

const tabs = [
  { id: "users", label: "Usuários", icon: Users },
  { id: "products", label: "Produtos", icon: ShoppingBag },
  { id: "stores", label: "Lojas Parceiras", icon: Store },
  { id: "rates", label: "Taxas de Material", icon: Coins },
  { id: "points", label: "Pontos de Coleta", icon: MapPin },
  { id: "transactions", label: "Transações", icon: Receipt },
  { id: "promotions", label: "Promoções", icon: Megaphone },
  { id: "contacts", label: "Contato", icon: Mail },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
  { id: "monitoring", label: "Monitoramento", icon: Activity },
];

const Admin = () => {
  const { isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Settings className="h-6 w-6 text-muted-foreground" />
          Painel Administrativo
        </h1>
        <p className="text-sm text-muted-foreground">Gerencie usuários, produtos, pontos e transações.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "users" && <AdminUsers />}
      {activeTab === "products" && <AdminProducts />}
      {activeTab === "stores" && <AdminStores />}
      {activeTab === "rates" && <AdminMaterialRates />}
      {activeTab === "points" && <AdminCollectionPoints />}
      {activeTab === "transactions" && <AdminTransactions />}
      {activeTab === "promotions" && <AdminPromotions />}
      {activeTab === "contacts" && <AdminContacts />}
      {activeTab === "reports" && <AdminReports />}
      {activeTab === "monitoring" && <AdminMonitoring />}
    </div>
  );
};

export default Admin;
