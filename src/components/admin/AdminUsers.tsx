import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Pencil, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const AdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", cpf: "", email: "", password: "" });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({
        full_name: editForm.full_name,
        phone: editForm.phone,
        cpf: editForm.cpf,
      }).eq("user_id", editingUser.user_id);
      if (error) throw error;

      const emailChanged = editForm.email.trim() && editForm.email.trim() !== (editingUser.email ?? "");
      const passwordChanged = !!editForm.password;
      if (emailChanged || passwordChanged) {
        const { data, error: fnError } = await supabase.functions.invoke("admin-update-user", {
          body: {
            user_id: editingUser.user_id,
            ...(emailChanged ? { email: editForm.email.trim() } : {}),
            ...(passwordChanged ? { password: editForm.password } : {}),
          },
        });
        if (fnError) throw new Error((data as any)?.error || fnError.message);
        if ((data as any)?.error) throw new Error((data as any).error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      setEditingUser(null);
      toast({ title: "Perfil atualizado!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_active: !isActive }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: "Status do usuário atualizado!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const startEdit = (p: any) => {
    setEditForm({ full_name: p.full_name || "", phone: p.phone || "", cpf: p.cpf || "", email: p.email || "", password: "" });
    setEditingUser(p);
  };

  const filtered = profiles.filter(p =>
    (p.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (p.email?.toLowerCase() || "").includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou email..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">CPF</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Saldo (FC)</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Reciclado</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(profile => {
                const isActive = (profile as any).is_active !== false;
                return (
                  <tr key={profile.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${!isActive ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{profile.full_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{profile.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{profile.cpf || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{Number(profile.balance)} FC</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{Number(profile.total_recycled_kg)} kg</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={isActive ? "default" : "destructive"} className="text-xs">
                        {isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" title="Editar" onClick={() => startEdit(profile)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title={isActive ? "Desativar" : "Ativar"}
                          onClick={() => {
                            if (isActive && !confirm("Tem certeza que deseja desativar este usuário?")) return;
                            toggleActive.mutate({ userId: profile.user_id, isActive });
                          }}
                        >
                          {isActive ? <UserX className="h-3 w-3 text-destructive" /> : <UserCheck className="h-3 w-3 text-primary" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20" onClick={() => setEditingUser(null)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-card-hover" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-foreground">Editar Usuário</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Nome completo</label>
                <Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Telefone</label>
                <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">CPF</label>
                <Input value={editForm.cpf} onChange={e => setEditForm(f => ({ ...f, cpf: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
                <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Nova senha</label>
                <Input
                  type="password"
                  placeholder="Deixe em branco para manter a atual"
                  value={editForm.password}
                  onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                />
                <p className="mt-1 text-xs text-muted-foreground">Mínimo de 6 caracteres. Preencha apenas para redefinir.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingUser(null)}>Cancelar</Button>
                <Button className="flex-1" onClick={() => updateProfile.mutate()} disabled={!editForm.full_name}>
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
