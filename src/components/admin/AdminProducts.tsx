import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Upload, X, Image as ImageIcon, RotateCcw, Eye, EyeOff, PlusCircle, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductForm {
  name: string;
  description: string;
  price_fc: string;
  category: string;
  featured: boolean;
  image_url: string;
}

const emptyForm: ProductForm = { name: "", description: "", price_fc: "", category: "geral", featured: false, image_url: "" };

const AdminProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [tab, setTab] = useState<"system" | "partners">("system");
  const [storeFilter, setStoreFilter] = useState<string>("all");

  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores-list"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("product_categories").select("*").order("label");
      return data ?? [];
    },
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["admin-products-all"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createCategoryMut = useMutation({
    mutationFn: async (label: string) => {
      const name = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const { error } = await supabase.from("product_categories").insert({ name, label });
      if (error) throw error;
      return name;
    },
    onSuccess: (name) => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      setForm(f => ({ ...f, category: name }));
      setNewCategoryLabel("");
      setShowNewCategory(false);
      toast({ title: "Categoria criada!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteCategoryMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast({ title: "Categoria excluída!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const visibleProducts = showInactive ? allProducts : allProducts.filter(p => p.active);
  const products = visibleProducts.filter(p => !p.store_id);
  const partnerProducts = visibleProducts
    .filter(p => p.store_id)
    .filter(p => storeFilter === "all" || p.store_id === storeFilter);
  const storeName = (id: string | null) => stores.find(s => s.id === id)?.name ?? "—";

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm(f => ({ ...f, image_url: url }));
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
        description: form.description,
        price_fc: Number(form.price_fc),
        category: form.category,
        featured: form.featured,
        image_url: form.image_url || null,
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
      queryClient.invalidateQueries({ queryKey: ["admin-products-all"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
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
      queryClient.invalidateQueries({ queryKey: ["admin-products-all"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const startEdit = (p: any) => {
    setForm({ name: p.name, description: p.description || "", price_fc: String(p.price_fc), category: p.category, featured: p.featured, image_url: p.image_url || "" });
    setPreviewUrl(p.image_url || null);
    setEditing(p.id);
    setShowForm(true);
  };

  const clearImage = () => {
    setForm(f => ({ ...f, image_url: "" }));
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "system" | "partners")} className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">Produtos do Sistema</TabsTrigger>
          <TabsTrigger value="partners">
            <Store className="mr-2 h-4 w-4" /> Lojas Parceiras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setShowInactive(!showInactive)}>
          {showInactive ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showInactive ? "Ocultar inativos" : "Mostrar inativos"}
        </Button>
        <Button onClick={() => { setForm(emptyForm); setEditing(null); setPreviewUrl(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card p-6 shadow-card space-y-3">
          <h3 className="font-semibold text-foreground">{editing ? "Editar Produto" : "Novo Produto"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Preço (FC)" type="number" value={form.price_fc} onChange={e => setForm(f => ({ ...f, price_fc: e.target.value }))} />
            <div className="space-y-2">
              <Select value={form.category} onValueChange={v => {
                if (v === "__new__") {
                  setShowNewCategory(true);
                } else {
                  setForm(f => ({ ...f, category: v }));
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.label}</SelectItem>
                  ))}
                  <SelectItem value="__new__">
                    <span className="flex items-center gap-1"><PlusCircle className="h-3 w-3" /> Nova categoria</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {showNewCategory && (
                <div className="flex gap-2">
                  <Input placeholder="Nome da nova categoria" value={newCategoryLabel} onChange={e => setNewCategoryLabel(e.target.value)} />
                  <Button type="button" size="sm" onClick={() => newCategoryLabel && createCategoryMut.mutate(newCategoryLabel)} disabled={!newCategoryLabel}>Criar</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewCategory(false)}>Cancelar</Button>
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {categories.map(c => (
                  <Badge key={c.id} variant="secondary" className="flex items-center gap-1 text-xs">
                    {c.label}
                    <button
                      type="button"
                      onClick={() => { if (confirm(`Excluir categoria "${c.label}"?`)) deleteCategoryMut.mutate(c.id); }}
                      className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="rounded" />
              Destaque
            </label>
          </div>
          <textarea placeholder="Descrição" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Imagem do produto</label>
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />{uploading ? "Enviando..." : "Enviar imagem"}
              </Button>
              {previewUrl && <Button type="button" variant="ghost" size="sm" onClick={clearImage}><X className="mr-1 h-3 w-3" /> Remover</Button>}
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Preço (FC)</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
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
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
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
            </tbody>
          </table>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowInactive(!showInactive)}>
              {showInactive ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {showInactive ? "Ocultar inativos" : "Mostrar inativos"}
            </Button>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as lojas</SelectItem>
                {stores.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Imagem</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Loja</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Preço (FC)</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerProducts.map(p => (
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
                      <td className="px-4 py-3 text-muted-foreground">{storeName(p.store_id)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{Number(p.price_fc)} FC</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={p.active ? "default" : "destructive"} className="text-xs">
                          {p.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {partnerProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum produto de loja parceira encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminProducts;
