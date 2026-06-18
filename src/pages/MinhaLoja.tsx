import { useState, useRef, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store as StoreIcon, Plus, Pencil, Trash2, Upload, X, Image as ImageIcon, RotateCcw, Eye, EyeOff, Save, ClipboardList, Phone } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const ORDER_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  separacao: { label: "Em separação", variant: "outline" },
  enviado: { label: "Enviado", variant: "outline" },
  entregue: { label: "Entregue", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};
const ORDER_STATUS_KEYS = ["pendente", "separacao", "enviado", "entregue", "cancelado"] as const;

interface ProductForm {
  name: string;
  description: string;
  price_fc: string;
  featured: boolean;
  image_url: string;
}

const emptyProduct: ProductForm = { name: "", description: "", price_fc: "", featured: false, image_url: "" };

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const uploadImage = async (file: File, prefix: string): Promise<string> => {
  const ext = file.name.split(".").pop();
  const path = `${prefix}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
};

const MinhaLoja = () => {
  const { user, isLojista, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").eq("owner_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["my-store-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("balance, pending_balance").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // ---- Store info form ----
  const [storeForm, setStoreForm] = useState({ name: "", category: "", description: "", address: "", phone: "", logo_url: "" });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (store) {
      setStoreForm({
        name: store.name || "",
        category: store.category || "",
        description: store.description || "",
        address: store.address || "",
        phone: store.phone || "",
        logo_url: store.logo_url || "",
      });
      setLogoPreview(store.logo_url || null);
    }
  }, [store]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await uploadImage(file, "store");
      setStoreForm((f) => ({ ...f, logo_url: url }));
      setLogoPreview(url);
      toast({ title: "Logo enviado!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setLogoUploading(false);
    }
  };

  const saveStore = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("stores")
        .update({
          name: storeForm.name,
          category: storeForm.category || null,
          description: storeForm.description || null,
          address: storeForm.address || null,
          phone: storeForm.phone || null,
          logo_url: storeForm.logo_url || null,
        })
        .eq("id", store!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-store"] });
      queryClient.invalidateQueries({ queryKey: ["partner-stores"] });
      toast({ title: "Dados da loja salvos!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  // ---- Products ----
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: allProducts = [] } = useQuery({
    queryKey: ["my-store-products", store?.id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("store_id", store!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!store,
  });

  const products = showInactive ? allProducts : allProducts.filter((p) => p.active);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "product");
      setForm((f) => ({ ...f, image_url: url }));
      setPreviewUrl(url);
      toast({ title: "Imagem enviada!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description || null,
        price_fc: Number(form.price_fc),
        category: storeForm.category || "loja",
        featured: form.featured,
        image_url: form.image_url || null,
        store_id: store!.id,
      };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-store-products"] });
      queryClient.invalidateQueries({ queryKey: ["partner-products"] });
      setShowForm(false);
      setEditing(null);
      setForm(emptyProduct);
      setPreviewUrl(null);
      toast({ title: editing ? "Produto atualizado!" : "Produto criado!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-store-products"] });
      queryClient.invalidateQueries({ queryKey: ["partner-products"] });
      toast({ title: "Status atualizado!" });
    },
  });

  // ---- Orders ----
  const { data: orders = [] } = useQuery({
    queryKey: ["my-store-orders", store?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!store,
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-store-orders"] });
      toast({ title: "Status do pedido atualizado!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const startEdit = (p: any) => {
    setForm({ name: p.name, description: p.description || "", price_fc: String(p.price_fc), featured: p.featured, image_url: p.image_url || "" });
    setPreviewUrl(p.image_url || null);
    setEditing(p.id);
    setShowForm(true);
  };

  if (loading || storeLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isLojista) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <StoreIcon className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhuma loja vinculada a esta conta.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <StoreIcon className="h-6 w-6 text-muted-foreground" />
          Minha Loja
        </h1>
        <p className="text-sm text-muted-foreground">Gerencie os dados da sua loja e os produtos disponíveis.</p>
      </div>

      {/* Saldos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-primary-foreground">
          <p className="text-sm font-medium text-primary-foreground/80">Saldo disponível</p>
          <p className="text-2xl font-bold tabular-nums">{Number(profile?.balance ?? 0)} FC</p>
        </div>
        <div className="rounded-xl bg-card px-6 py-4 shadow-card">
          <p className="text-sm font-medium text-muted-foreground">Saldo pendente</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{Number(profile?.pending_balance ?? 0)} FC</p>
          <p className="mt-1 text-xs text-muted-foreground">Liberado automaticamente no 5º dia útil de cada mês.</p>
        </div>
      </div>

      {/* Store data */}
      <section className="rounded-xl bg-card p-6 shadow-card space-y-3">
        <h2 className="font-semibold text-foreground">Dados da loja</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Nome da loja" value={storeForm.name} onChange={(e) => setStoreForm((f) => ({ ...f, name: e.target.value }))} />
          <Input placeholder="Categoria (ex: Alimentação)" value={storeForm.category} onChange={(e) => setStoreForm((f) => ({ ...f, category: e.target.value }))} />
          <Input placeholder="Telefone" value={storeForm.phone} onChange={(e) => setStoreForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))} />
          <Input placeholder="Endereço" value={storeForm.address} onChange={(e) => setStoreForm((f) => ({ ...f, address: e.target.value }))} />
        </div>
        <textarea
          placeholder="Descrição da loja"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
          rows={3}
          value={storeForm.description}
          onChange={(e) => setStoreForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Logo da loja</label>
          <div className="flex items-center gap-3">
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            <Button type="button" variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={logoUploading}>
              <Upload className="mr-2 h-4 w-4" />{logoUploading ? "Enviando..." : "Enviar logo"}
            </Button>
            {logoPreview && (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setStoreForm((f) => ({ ...f, logo_url: "" })); setLogoPreview(null); }}>
                <X className="mr-1 h-3 w-3" /> Remover
              </Button>
            )}
          </div>
          {logoPreview && (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <Button onClick={() => saveStore.mutate()} disabled={!storeForm.name || saveStore.isPending}>
          <Save className="mr-2 h-4 w-4" />{saveStore.isPending ? "Salvando..." : "Salvar dados"}
        </Button>
      </section>

      {/* Products */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Meus produtos</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowInactive(!showInactive)}>
              {showInactive ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {showInactive ? "Ocultar inativos" : "Mostrar inativos"}
            </Button>
            <Button onClick={() => { setForm(emptyProduct); setEditing(null); setPreviewUrl(null); setShowForm(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Novo Produto
            </Button>
          </div>
        </div>

        {showForm && (
          <div className="rounded-xl bg-card p-6 shadow-card space-y-3">
            <h3 className="font-semibold text-foreground">{editing ? "Editar Produto" : "Novo Produto"}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input placeholder="Preço (FC)" type="number" value={form.price_fc} onChange={(e) => setForm((f) => ({ ...f, price_fc: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} className="rounded" />
                Destaque
              </label>
            </div>
            <textarea placeholder="Descrição" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Imagem do produto</label>
              <div className="flex items-center gap-3">
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="mr-2 h-4 w-4" />{uploading ? "Enviando..." : "Enviar imagem"}
                </Button>
                {previewUrl && <Button type="button" variant="ghost" size="sm" onClick={() => { setForm((f) => ({ ...f, image_url: "" })); setPreviewUrl(null); }}><X className="mr-1 h-3 w-3" /> Remover</Button>}
              </div>
              {previewUrl && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); setPreviewUrl(null); }}>Cancelar</Button>
              <Button onClick={() => upsert.mutate()} disabled={!form.name || !form.price_fc}>Salvar</Button>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Imagem</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Preço (FC)</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${!p.active ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">{Number(p.price_fc)} FC</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={p.active ? "default" : "destructive"} className="text-xs">
                        {p.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-3 w-3" /></Button>
                        {p.active ? (
                          <Button size="sm" variant="ghost" onClick={() => {
                            if (!confirm("Desativar este produto?")) return;
                            toggleActive.mutate({ id: p.id, active: p.active });
                          }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => toggleActive.mutate({ id: p.id, active: p.active })}>
                            <RotateCcw className="h-3 w-3 text-primary" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum produto cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MinhaLoja;