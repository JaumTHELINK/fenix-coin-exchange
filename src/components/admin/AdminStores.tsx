import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Upload, X, Store as StoreIcon, RotateCcw, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StoreForm {
  name: string;
  email: string;
  password: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  logo_url: string;
}

const emptyForm: StoreForm = {
  name: "", email: "", password: "", category: "", description: "", address: "", phone: "", logo_url: "",
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const AdminStores = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: allStores = [] } = useQuery({
    queryKey: ["admin-stores-all"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const stores = showInactive ? allStores : allStores.filter((s) => s.active);

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `store-${crypto.randomUUID()}.${ext}`;
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
      setForm((f) => ({ ...f, logo_url: url }));
      setPreviewUrl(url);
      toast({ title: "Logo enviado!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const createStore = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-create-store", {
        body: {
          email: form.email,
          password: form.password,
          name: form.name,
          logo_url: form.logo_url || null,
          description: form.description || null,
          category: form.category || null,
          address: form.address || null,
          phone: form.phone || null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores-all"] });
      queryClient.invalidateQueries({ queryKey: ["partner-stores"] });
      resetForm();
      toast({ title: "Loja criada com sucesso!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const updateStore = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("stores")
        .update({
          name: form.name,
          logo_url: form.logo_url || null,
          description: form.description || null,
          category: form.category || null,
          address: form.address || null,
          phone: form.phone || null,
        })
        .eq("id", editing!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores-all"] });
      queryClient.invalidateQueries({ queryKey: ["partner-stores"] });
      resetForm();
      toast({ title: "Loja atualizada!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("stores").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores-all"] });
      queryClient.invalidateQueries({ queryKey: ["partner-stores"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (s: any) => {
    setForm({
      name: s.name,
      email: s.email || "",
      password: "",
      category: s.category || "",
      description: s.description || "",
      address: s.address || "",
      phone: s.phone || "",
      logo_url: s.logo_url || "",
    });
    setPreviewUrl(s.logo_url || null);
    setEditing(s.id);
    setShowForm(true);
  };

  const canSave = editing
    ? !!form.name
    : !!form.name && !!form.email && form.password.length >= 6;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setShowInactive(!showInactive)}>
          {showInactive ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showInactive ? "Ocultar inativas" : "Mostrar inativas"}
        </Button>
        <Button onClick={() => { setForm(emptyForm); setEditing(null); setPreviewUrl(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Loja
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card p-6 shadow-card space-y-3">
          <h3 className="font-semibold text-foreground">{editing ? "Editar Loja" : "Nova Loja Parceira"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nome da loja" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Categoria (ex: Alimentação)" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            <Input placeholder="Email de acesso" type="email" value={form.email} disabled={!!editing} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            {!editing && (
              <Input placeholder="Senha inicial (mín. 6)" type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            )}
            <Input placeholder="Telefone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))} />
            <Input placeholder="Endereço" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          {editing && (
            <p className="text-xs text-muted-foreground">O email de acesso e a senha não podem ser alterados aqui.</p>
          )}
          <textarea
            placeholder="Descrição da loja"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Logo da loja</label>
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />{uploading ? "Enviando..." : "Enviar logo"}
              </Button>
              {previewUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setForm((f) => ({ ...f, logo_url: "" })); setPreviewUrl(null); }}>
                  <X className="mr-1 h-3 w-3" /> Remover
                </Button>
              )}
            </div>
            {previewUrl && (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button
              onClick={() => (editing ? updateStore.mutate() : createStore.mutate())}
              disabled={!canSave || createStore.isPending || updateStore.isPending}
            >
              {createStore.isPending || updateStore.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Logo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${!s.active ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <StoreIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.category || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={s.active ? "default" : "destructive"} className="text-xs">
                      {s.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(s)}><Pencil className="h-3 w-3" /></Button>
                      {s.active ? (
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (!confirm("Desativar esta loja?")) return;
                          toggleActive.mutate({ id: s.id, active: s.active });
                        }}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => toggleActive.mutate({ id: s.id, active: s.active })}>
                          <RotateCcw className="h-3 w-3 text-primary" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {stores.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma loja parceira cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminStores;