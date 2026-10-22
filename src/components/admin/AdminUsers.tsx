import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Pencil, UserCheck, UserX, Shield, ShieldOff, Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const AdminUsers = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", cpf: "", password: "" });

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

      const passwordChanged = !!editForm.password;
      if (passwordChanged) {
        const { data, error: fnError } = await supabase.functions.invoke("admin-update-user", {
          body: {
            user_id: editingUser.user_id,
            password: editForm.password,
          },
        });
        if (fnError) {
          let msg = (data as any)?.error as string | undefined;
          try {
            const body = await (fnError as any).context?.json?.();
            if (body?.error) msg = body.error;
          } catch { /* ignore parse errors */ }
          throw new Error(msg || "Não foi possível atualizar o usuário.");
        }
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
      queryClient.invalidateQueries({ queryKey: ["available-partner-stores"] });
      queryClient.invalidateQueries({ queryKey: ["partner-stores"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });
  const hasRole = (uid: string, role: string) => roles.some(r => r.user_id === uid && r.role === role);

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (!makeAdmin && userId === user?.id) throw new Error("Você não pode remover seu próprio acesso de administrador.");
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast({ title: v.makeAdmin ? "Usuário agora é administrador" : "Acesso de administrador removido", description: "A pessoa precisa sair e entrar novamente." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const [storeFor, setStoreFor] = useState<any | null>(null);
  const [storeName, setStoreName] = useState("");

  const makeLojista = useMutation({
    mutationFn: async () => {
      const name = storeName.trim();
      if (name.length < 2 || name.length > 100) throw new Error("Informe um nome de loja entre 2 e 100 caracteres.");
      const { data: existing } = await supabase.from("stores").select("id").eq("owner_id", storeFor.user_id).maybeSingle();
      if (!existing) {
        const { error } = await supabase.from("stores").insert({
          owner_id: storeFor.user_id, name, phone: storeFor.phone || null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stores").update({ active: true }).eq("id", existing.id);
        if (error) throw error;
      }
      const { error: rErr } = await supabase.from("user_roles").insert({ user_id: storeFor.user_id, role: "lojista" });
      if (rErr && rErr.code !== "23505") throw rErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stores-all"] });
      setStoreFor(null);
      setStoreName("");
      toast({ title: "Loja parceira criada!", description: "A pessoa precisa sair e entrar novamente." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const removeLojista = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "lojista");
      if (error) throw error;
      const { error: sErr } = await supabase.from("stores").update({ active: false }).eq("owner_id", userId);
      if (sErr) throw sErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stores-all"] });
      toast({ title: "Acesso de loja parceira removido", description: "A loja foi desativada." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const startEdit = (p: any) => {
    setEditForm({ full_name: p.full_name || "", phone: p.phone || "", cpf: p.cpf || "", password: "" });
    setEditingUser(p);
  };

  const filtered = profiles.filter(p =>
    (p.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (p.cpf || "").includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou CPF..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
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
                    <td className="px-4 py-3 text-muted-foreground">{profile.cpf || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{Number(profile.balance)} FC</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{Number(profile.total_recycled_kg)} kg</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        <Badge variant={isActive ? "default" : "destructive"} className="text-xs">
                          {isActive ? "Ativo" : "Inativo"}
                        </Badge>
                        {hasRole(profile.user_id, "admin") && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                        {hasRole(profile.user_id, "lojista") && <Badge variant="outline" className="text-xs">Loja parceira</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" title="Editar" onClick={() => startEdit(profile)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {(() => {
                          const isAdm = hasRole(profile.user_id, "admin");
                          return (
                            <Button
                              size="sm"
                              variant="ghost"
                              title={isAdm ? "Remover administrador" : "Tornar administrador"}
                              disabled={isAdm && profile.user_id === user?.id}
                              onClick={() => {
                                const msg = isAdm
                                  ? `Remover o acesso de administrador de ${profile.full_name || profile.cpf}?`
                                  : `Tornar ${profile.full_name || profile.cpf} administrador? Essa pessoa terá acesso total ao painel.`;
                                if (!confirm(msg)) return;
                                toggleAdmin.mutate({ userId: profile.user_id, makeAdmin: !isAdm });
                              }}
                            >
                              {isAdm ? <ShieldOff className="h-3 w-3 text-destructive" /> : <Shield className="h-3 w-3 text-primary" />}
                            </Button>
                          );
                        })()}
                        <Button
                          size="sm"
                          variant="ghost"
                          title={hasRole(profile.user_id, "lojista") ? "Remover loja parceira" : "Tornar loja parceira"}
                          onClick={() => {
                            if (hasRole(profile.user_id, "lojista")) {
                              if (!confirm("Remover o acesso de loja parceira? A loja será desativada.")) return;
                              removeLojista.mutate(profile.user_id);
                            } else {
                              setStoreName("");
                              setStoreFor(profile);
                            }
                          }}
                        >
                          <Store className={`h-3 w-3 ${hasRole(profile.user_id, "lojista") ? "text-destructive" : "text-primary"}`} />
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

      {storeFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20" onClick={() => setStoreFor(null)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-card-hover" onClick={e => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-semibold text-foreground">Tornar loja parceira</h3>
            <p className="mb-4 text-sm text-muted-foreground">{storeFor.full_name || storeFor.cpf}</p>
            <label className="mb-1 block text-sm font-medium text-foreground">Nome da loja</label>
            <Input maxLength={100} value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Ex.: Padaria Central" />
            <p className="mt-1 text-xs text-muted-foreground">Os demais dados da loja podem ser completados em "Lojas Parceiras" ou pelo próprio lojista.</p>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setStoreFor(null)}>Cancelar</Button>
              <Button className="flex-1" disabled={storeName.trim().length < 2 || makeLojista.isPending} onClick={() => makeLojista.mutate()}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

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
