import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RateForm {
  material: string;
  examples: string;
  quantity_per_fenix: string;
  fenix_per_unit: string;
  unit: string;
}

const emptyForm: RateForm = { material: "", examples: "", quantity_per_fenix: "", fenix_per_unit: "1", unit: "kg" };

const AdminMaterialRates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RateForm>(emptyForm);

  const { data: rates = [] } = useQuery({
    queryKey: ["admin-material-rates"],
    queryFn: async () => {
      const { data } = await supabase.from("material_rates").select("*").order("material");
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        material: form.material,
        examples: form.examples.trim(),
        quantity_per_fenix: Number(form.quantity_per_fenix),
        fenix_per_unit: Number(form.fenix_per_unit),
        unit: form.unit,
      };
      if (editing) {
        const { error } = await supabase.from("material_rates").update(payload).eq("id", editing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("material_rates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-material-rates"] });
      queryClient.invalidateQueries({ queryKey: ["material-rates"] });
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      toast({ title: editing ? "Taxa atualizada!" : "Taxa criada!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const toggleActiveMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("material_rates").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-material-rates"] });
      queryClient.invalidateQueries({ queryKey: ["material-rates"] });
      toast({ title: active ? "Taxa reativada!" : "Taxa desativada!" });
    },
  });

  const startEdit = (r: any) => {
    setForm({
      material: r.material,
      examples: r.examples || "",
      quantity_per_fenix: String(r.quantity_per_fenix),
      fenix_per_unit: String(r.fenix_per_unit),
      unit: r.unit,
    });
    setEditing(r.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Taxa
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card p-6 shadow-card space-y-3">
          <h3 className="font-semibold text-foreground">{editing ? "Editar Taxa" : "Nova Taxa"}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input placeholder="Material (ex: Plástico)" value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} />
            <Input placeholder="Quantidade por Fênix" type="number" value={form.quantity_per_fenix} onChange={e => setForm(f => ({ ...f, quantity_per_fenix: e.target.value }))} />
            <Input placeholder="Fênix por unidade" type="number" value={form.fenix_per_unit} onChange={e => setForm(f => ({ ...f, fenix_per_unit: e.target.value }))} />
            <Input placeholder="Unidade (kg, und, litros)" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Exemplos do que é aceito (opcional)</label>
            <Input
              placeholder="Ex: garrafas PET, sacolas, embalagens de produto de limpeza"
              value={form.examples}
              onChange={e => setForm(f => ({ ...f, examples: e.target.value }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Separe os exemplos por vírgula para deixar claro ao usuário quais tipos são aceitos.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
            <Button onClick={() => upsert.mutate()} disabled={!form.material || !form.quantity_per_fenix}>Salvar</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Material</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Quantidade</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unidade</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Fênix</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rates.map(r => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {r.material}
                    {r.examples && <div className="mt-0.5 text-xs font-normal text-muted-foreground">{r.examples}</div>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{Number(r.quantity_per_fenix)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.unit}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-primary font-bold">{Number(r.fenix_per_unit)} FC</td>
                  <td className="px-4 py-3 text-center">{r.active ? "✅" : "❌"}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActiveMut.mutate({ id: r.id, active: !r.active })}>
                        {r.active ? <Trash2 className="h-3 w-3 text-destructive" /> : <span className="text-xs text-primary font-medium">Reativar</span>}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminMaterialRates;
