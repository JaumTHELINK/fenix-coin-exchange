import { useState } from "react";
import { Search, ShoppingBag, Info, Store as StoreIcon, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";


const Loja = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("balance").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const balance = Number(profile?.balance ?? 0);

  const redeem = useMutation({
    mutationFn: async (productId: string) => {
      const { data, error } = await supabase.rpc("redeem_store_product", { _product_id: productId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Resgate realizado!", description: "O produto foi resgatado com sucesso." });
    },
    onError: (err: any) => toast({ title: "Não foi possível resgatar", description: err.message, variant: "destructive" }),
  });

  const handleRedeem = (product: ProductType) => {
    if (balance < Number(product.price_fc)) {
      toast({ title: "Saldo insuficiente", description: "Você não tem Fênix Coins suficientes para este resgate.", variant: "destructive" });
      return;
    }
    if (!confirm(`Resgatar "${product.name}" por ${Number(product.price_fc)} FC?`)) return;
    redeem.mutate(product.id);
  };

  const { data: dbCategories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("product_categories").select("*").eq("active", true).order("label");
      return data ?? [];
    },
    enabled: !!user,
  });

  const categories = ["Todos", ...dbCategories.map(c => c.name)];
  const categoryLabels: Record<string, string> = {
    Todos: "Todos",
    ...Object.fromEntries(dbCategories.map(c => [c.name, c.label])),
  };

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("featured", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: partnerStores = [] } = useQuery({
    queryKey: ["partner-stores"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").eq("active", true).order("name");
      return data ?? [];
    },
    enabled: !!user,
  });

  const ecoteinerProducts = products.filter((p) => !p.store_id);
  const partnerProducts = products.filter((p) => p.store_id);

  const filtered = ecoteinerProducts.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "Todos" || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const featured = filtered.filter((p) => p.featured);

  const storesWithProducts = partnerStores
    .filter((store) => store.owner_id !== user?.id)
    .map((store) => ({
      store,
      items: partnerProducts.filter(
        (p) => p.store_id === store.id && p.name.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Loja Ecoteiner</h1>
        <p className="text-sm text-muted-foreground">
          Conheça os produtos e benefícios disponíveis. As trocas são realizadas nos pontos de coleta.
        </p>
      </div>

      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-primary-foreground">
        <p className="text-sm font-medium text-primary-foreground/80">Seu saldo atual</p>
        <p className="text-2xl font-bold tabular-nums">{Number(profile?.balance ?? 0)} Fênix Coins</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar produtos..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {featured.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Produtos em Destaque</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Todos os Produtos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
          </div>
        )}
      </section>

      {storesWithProducts.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <StoreIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Lojas Parceiras</h2>
          </div>
          {storesWithProducts.map(({ store, items }) => (
            <div key={store.id} className="rounded-xl bg-card p-5 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                  ) : (
                    <StoreIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{store.name}</p>
                  {store.category && <p className="text-xs text-muted-foreground">{store.category}</p>}
                  {store.address && <p className="text-xs text-muted-foreground">{store.address}</p>}
                </div>
              </div>
              {store.description && (
                <p className="mb-4 text-sm text-muted-foreground">{store.description}</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="rounded-xl bg-accent p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 text-accent-foreground" />
          <div>
            <p className="font-semibold text-accent-foreground">Como funciona?</p>
            <p className="text-sm text-accent-foreground/80">
              Os produtos mostrados aqui são informativos. Para realizar trocas e ganhar Fênix Coins, visite um dos nossos pontos de coleta com seus materiais recicláveis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProductType {
  id: string;
  name: string;
  description: string | null;
  price_fc: number;
  category: string;
  image_url: string | null;
  featured: boolean;
}

const ProductCard = ({ product }: { product: ProductType }) => (
  <Link to={`/loja/${product.id}`} className="group rounded-xl bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover block">
    <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-muted overflow-hidden">
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
      ) : (
        <ShoppingBag className="h-8 w-8 text-muted-foreground transition-transform group-hover:scale-110" />
      )}
    </div>
    <p className="text-sm font-medium text-foreground">{product.name}</p>
    {product.description && (
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{product.description}</p>
    )}
    <div className="mt-3 flex items-center justify-between">
      <span className="text-sm font-bold text-primary tabular-nums">{Number(product.price_fc)} FC</span>
      <span className="text-xs text-muted-foreground">Informativo</span>
    </div>
  </Link>
);

export default Loja;
