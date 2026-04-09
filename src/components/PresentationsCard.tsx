import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { OperationPresentations, GlobalParameters } from "@/lib/types";
import { getCommissionTier } from "@/lib/commission";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PresentationsCardProps {
  data: OperationPresentations;
  globalParams?: GlobalParameters;
  onChangeBluepex: (count: number) => void;
  onChangeOpus: (count: number) => void;
}

function StatusBadge({ presentations, meta, superMeta }: { presentations: number; meta: number; superMeta: number }) {
  const tier = getCommissionTier(presentations, meta, superMeta);

  const colorClass = tier.rate >= 2.0
    ? "bg-primary/15 text-primary border-primary/30"
    : tier.rate >= 1.0
    ? "bg-success/15 text-success border-success/30"
    : "bg-warning/15 text-warning border-warning/30";

  return (
    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${colorClass}`}>
      {tier.label}
    </Badge>
  );
}

export function PresentationsCard({ data, globalParams, onChangeBluepex, onChangeOpus }: PresentationsCardProps) {
  const bpMeta = globalParams?.meta_apresentacoes_bluepex ?? 15;
  const bpSuperMeta = globalParams?.super_meta_bluepex ?? 30;
  const opMeta = globalParams?.meta_apresentacoes_opus ?? 15;
  const opSuperMeta = globalParams?.super_meta_opus ?? 30;

  const bpTier = getCommissionTier(data.bluepex, bpMeta, bpSuperMeta);
  const opTier = getCommissionTier(data.opus, opMeta, opSuperMeta);

  return (
    <Card className="glass-card col-span-2">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide block">
            Apresentações por Operação
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-[14px] w-[14px] text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px] text-xs">
                Regras de conversão: alcance a meta estipulada para ativar aceleradores de comissão.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* BluePex */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-[11px] font-semibold text-blue-500">BluePex</label>
              <StatusBadge presentations={data.bluepex} meta={bpMeta} superMeta={bpSuperMeta} />
            </div>
            <Input
              type="number"
              min={0}
              value={data.bluepex}
              onChange={(e) => onChangeBluepex(Math.max(0, parseInt(e.target.value) || 0))}
              className="text-xl font-bold tracking-tight h-9 border-0 bg-muted/40 px-2 w-20"
            />
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${bpTier.rate >= 1.0 ? "bg-success" : "bg-warning"}`} />
              <span className="text-[10px] text-muted-foreground">
                {data.bluepex >= bpSuperMeta
                  ? "Super Meta atingida"
                  : data.bluepex >= bpMeta
                  ? "Meta atingida"
                  : `Faltam ${bpMeta - data.bluepex} para meta`}
              </span>
            </div>
          </div>
          {/* Opus Tech */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-[11px] font-semibold text-purple-500">Opus Tech</label>
              <StatusBadge presentations={data.opus} meta={opMeta} superMeta={opSuperMeta} />
            </div>
            <Input
              type="number"
              min={0}
              value={data.opus}
              onChange={(e) => onChangeOpus(Math.max(0, parseInt(e.target.value) || 0))}
              className="text-xl font-bold tracking-tight h-9 border-0 bg-muted/40 px-2 w-20"
            />
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${opTier.rate >= 1.0 ? "bg-success" : "bg-warning"}`} />
              <span className="text-[10px] text-muted-foreground">
                {data.opus >= opSuperMeta
                  ? "Super Meta atingida"
                  : data.opus >= opMeta
                  ? "Meta atingida"
                  : `Faltam ${opMeta - data.opus} para meta`}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
