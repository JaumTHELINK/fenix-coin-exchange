import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Loader2, Minus, Plus, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [redeemed, setRedeemed] = useState<{ quantity: number; total: number } | null>(null);

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
    mutationFn: async ({ productId, qty }: { productId: string; qty: number }) => {
      const { data, error } = await supabase.rpc("redeem_store_product", { _product_id: productId, _quantity: qty });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["partner-products"] });
      const total = Number(product?.price_fc ?? 0) * variables.qty;
      setRedeemed({ quantity: variables.qty, total });
      toast({ title: "Resgate realizado!", description: "O produto foi resgatado com sucesso." });
    },
    onError: (err: any) => toast({ title: "Não foi possível resgatar", description: err.message, variant: "destructive" }),
  });

  const balance = Number(profile?.balance ?? 0);
  const unitPrice = Number(product?.price_fc ?? 0);
  const totalPrice = unitPrice * quantity;
  const stock: number | null =
    product?.stock === null || product?.stock === undefined ? null : Number(product.stock);
  const outOfStock = stock !== null && stock <= 0;
  const maxQty = stock === null ? 100 : Math.min(100, stock);

  const handleConfirmRedeem = () => {
    if (!product) return;
    if (outOfStock) {
      toast({ title: "Produto esgotado", description: "Este produto não tem estoque disponível.", variant: "destructive" });
      return;
    }
    if (stock !== null && quantity > stock) {
      toast({ title: "Estoque insuficiente", description: `Apenas ${stock} unidade(s) disponível(is).`, variant: "destructive" });
      return;
    }
    if (balance < totalPrice) {
      toast({ title: "Saldo insuficiente", description: "Você não tem Fênix Coins suficientes para este resgate.", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
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

            {isPartnerProduct && !redeemed && (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Quantidade</p>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1 || redeem.isPending}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-10 text-center text-lg font-semibold tabular-nums text-foreground">{quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                      disabled={quantity >= 100 || redeem.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold tabular-nums text-foreground">
                    FC {totalPrice.toFixed(2).replace(".", ",")}
                  </span>
                </div>

                <Button className="w-full" onClick={handleConfirmRedeem} disabled={redeem.isPending}>
                  {redeem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resgatar"}
                </Button>
              </div>
            )}

            {isPartnerProduct && redeemed && (
              <div className="mt-4 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
                <div>
                  <p className="text-base font-semibold text-foreground">Resgate concluído!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {redeemed.quantity}x {product.name} • FC {redeemed.total.toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <Link to="/loja">
                  <Button variant="outline" className="w-full">Voltar à loja</Button>
                </Link>
              </div>
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar resgate</AlertDialogTitle>
            <AlertDialogDescription>
              Você está resgatando <span className="font-semibold text-foreground">{quantity}x {product.name}</span> por{" "}
              <span className="font-semibold text-foreground">FC {totalPrice.toFixed(2).replace(".", ",")}</span>. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => redeem.mutate({ productId: product.id, qty: quantity })}>
              Confirmar resgate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductDetail;
