import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, MapPin, Receipt, LogOut, Recycle, Shield, Menu, X, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Loja", icon: ShoppingBag, path: "/loja" },
  { label: "Pontos de Coleta", icon: MapPin, path: "/pontos" },
  { label: "Extrato", icon: Receipt, path: "/extrato" },
];

const adminItems = [
  { label: "Painel Admin", icon: Shield, path: "/admin" },
];

const lojistaItems = [
  { label: "Minha Loja", icon: Store, path: "/minha-loja" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin, isLojista } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Usuário";
  const balance = profile?.balance ?? 0;

  const allNavItems = [...navItems, ...(isLojista ? lojistaItems : []), ...(isAdmin ? adminItems : [])];

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Recycle className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">Ecoteiner</span>
        </div>
        <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {allNavItems.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{Number(balance)} Fenix Coins</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed left-4 top-4 z-50 rounded-lg bg-card p-2 shadow-card lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0 lg:z-30",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default AppSidebar;
