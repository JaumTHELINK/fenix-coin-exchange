import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("balance").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: store } = useQuery({
    queryKey: ["store", product?.store_id],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").eq("id", product!.store_id!).single();
      return data;
    },
    enabled: !!product?.store_id,
  });

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

  const balance = Number(profile?.balance ?? 0);

  const handleRedeem = () => {
    if (!product) return;
    if (balance < Number(product.price_fc)) {
      toast({ title: "Saldo insuficiente", description: "Você não tem Fênix Coins suficientes para este resgate.", variant: "destructive" });
      return;
    }
    if (!confirm(`Resgatar "${product.name}" por ${Number(product.price_fc)} FC?`)) return;
    redeem.mutate(product.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Produto não encontrado.</p>
        <Link to="/loja" className="mt-4 inline-block text-primary hover:underline">Voltar à loja</Link>
      </div>
    );
  }

  const isPartnerProduct = !!product.store_id && store?.owner_id !== user?.id;

  return (
    <div className="space-y-6">
      <Link to="/loja" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar à loja
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Product Image */}
        <div className="lg:col-span-2">
          <div className="flex h-64 sm:h-96 items-center justify-center rounded-xl bg-muted">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full w-full rounded-xl object-cover" />
            ) : (
              <ShoppingBag className="h-16 w-16 text-muted-foreground" />
            )}
          </div>

          {/* Description */}
          <div className="mt-6 rounded-xl bg-card p-6 shadow-card">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Descrição</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {product.description || "Sem descrição disponível."}
            </p>
          </div>
        </div>

        {/* Purchase Card */}
        <div className="space-y-4">
          <div className="rounded-xl bg-card p-6 shadow-card">
            <h1 className="text-xl font-bold text-foreground">{product.name}</h1>
            <p className="mt-1 text-sm text-primary">Mais informações</p>

            <div className="mt-4">
              <p className="text-3xl font-bold text-primary tabular-nums">
                FC {Number(product.price_fc).toFixed(2).replace(".", ",")}
              </p>
            </div>


            <p className="mt-3 text-xs text-muted-foreground underline cursor-pointer">
              Políticas de garantia e troca de produtos
            </p>

            {isPartnerProduct && (
              <Button className="mt-4 w-full" onClick={handleRedeem} disabled={redeem.isPending}>
                {redeem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resgatar"}
              </Button>
            )}
          </div>

          <div className="rounded-xl bg-accent p-4">
            <p className="text-sm text-accent-foreground">
              <span className="font-medium">Seu saldo:</span>{" "}
              <span className="tabular-nums font-bold">{Number(profile?.balance ?? 0)} FC</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
