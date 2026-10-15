import { useState } from "react";
import { MapPin, Phone, Clock, ExternalLink, Info, ChevronDown, ChevronUp, Coins, Recycle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const PontosColeta = () => {
  const { user } = useAuth();
  const [showRates, setShowRates] = useState(false);

  const { data: pontos = [] } = useQuery({
    queryKey: ["collection-points"],
    queryFn: async () => {
      const { data } = await supabase.from("collection_points").select("*").order("name");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: rates = [] } = useQuery({
    queryKey: ["material-rates"],
    queryFn: async () => {
      const { data } = await supabase.from("material_rates").select("*").order("material");
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pontos de Coleta</h1>
        <p className="text-sm text-muted-foreground">
          Encontre o ponto de coleta mais próximo para reciclar seus materiais e ganhar Fênix Coins.
        </p>
      </div>

      {/* Material Rates Toggle */}
      <div className="rounded-xl bg-card shadow-card overflow-hidden">
        <button
          onClick={() => setShowRates(!showRates)}
          className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Tabela de Pontos</p>
              <p className="text-xs text-muted-foreground">Veja quanto vale cada material em Fênix Coins</p>
            </div>
          </div>
          {showRates ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {showRates && (
          <div className="border-t border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Material</th>
                    <th className="px-6 py-3 text-center font-medium text-muted-foreground">Quantidade</th>
                    <th className="px-6 py-3 text-center font-medium text-muted-foreground">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((rate) => (
                    <tr key={rate.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-6 py-3 font-medium text-foreground">
                        {rate.material}
                        {rate.examples && (
                          <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                            Aceita: {rate.examples}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center tabular-nums text-muted-foreground">
                        {Number(rate.quantity_per_fenix)} {rate.unit}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary tabular-nums">
                          🪙 {Number(rate.fenix_per_unit)} fênix
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border bg-muted/30 px-6 py-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Obs.:</span> 🪙 1 fênix = R$ 1,00 — Dúvidas sobre o que pontua? Entre em contato conosco.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-accent p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 text-accent-foreground" />
          <div>
            <p className="font-semibold text-accent-foreground">Como funciona?</p>
            <p className="text-sm text-accent-foreground/80">
              Leve seus materiais recicláveis aos pontos de coleta para ganhar Fênix Coins e trocar por produtos e benefícios.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {pontos.map((ponto) => (
          <div key={ponto.id} className="rounded-xl bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              {ponto.name}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Endereço</p>
                  <p className="text-muted-foreground">{ponto.address}</p>
                </div>
              </div>
              {ponto.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Telefone</p>
                    <p className="text-muted-foreground">{ponto.phone}</p>
                  </div>
                </div>
              )}
              {ponto.hours && (
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Horário de Funcionamento</p>
                    <p className="text-muted-foreground">{ponto.hours}</p>
                  </div>
                </div>
              )}
              {/* Accepted materials */}
              {(() => {
                const mats = (ponto as any).accepted_materials || [];
                return mats.length > 0 ? (
                  <div className="flex items-start gap-3">
                    <Recycle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Materiais Aceitos</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {mats.map((m: string) => (
                          <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
            <div className="mt-4 flex gap-2">
              {ponto.lat && ponto.lng ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${ponto.lat},${ponto.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver no Mapa
                </a>
              ) : (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ponto.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver no Mapa
                </a>
              )}
              {ponto.phone && (
                <a
                  href={`tel:${ponto.phone}`}
                  className="flex items-center justify-center rounded-lg border border-border p-2.5 transition-colors hover:bg-accent"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-card p-6 shadow-card">
        <h2 className="mb-4 font-semibold text-foreground">Dicas Importantes</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-primary">Preparação dos Materiais:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Lave embalagens antes de levar</li>
              <li>• Remova tampas e rótulos quando possível</li>
              <li>• Separe por tipo de material</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-primary">O que levar:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Documento com foto</li>
              <li>• Materiais limpos e separados</li>
              <li>• Sacolas para organizar</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PontosColeta;
