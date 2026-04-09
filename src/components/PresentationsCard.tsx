import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OperationPresentations, AppSettings } from "@/lib/types";
import { getCommissionTier } from "@/lib/commission";
import { Plus, Minus, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PresentationsCardProps {
  presentations: OperationPresentations;
  onUpdate: (operation: "bluepex" | "opus", count: number) => void;
  settings: AppSettings;
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

export function PresentationsCard({ presentations, onUpdate, settings }: PresentationsCardProps) {
  const meta = 15;
  const superMeta = settings?.superMetaThreshold ?? 30;

  const bluepexCount = presentations?.bluepex ?? 0;
  const opusCount = presentations?.opus ?? 0;

  const bpTier = getCommissionTier(bluepexCount, meta, superMeta);
  const opTier = getCommissionTier(opusCount, meta, superMeta);

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
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-blue-500">BluePex</label>
              <StatusBadge presentations={bluepexCount} meta={meta} superMeta={superMeta} />
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => onUpdate("bluepex", Math.max(0, bluepexCount - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                min={0}
                value={bluepexCount}
                onChange={(e) => onUpdate("bluepex", parseInt(e.target.value) || 0)}
                className="text-lg font-bold text-center h-8 border-0 bg-muted/40 px-1 w-14 hide-arrows"
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => onUpdate("bluepex", bluepexCount + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${bpTier.rate >= 1.0 ? "bg-success" : "bg-warning"}`} />
              <span className="text-[10px] text-muted-foreground">
                {bluepexCount >= superMeta
                  ? "Super Meta atingida"
                  : bluepexCount >= meta
                  ? "Meta atingida"
                  : `Faltam ${meta - bluepexCount} para meta`}
              </span>
            </div>
          </div>

          {/* Opus Tech */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-purple-500">Opus Tech</label>
              <StatusBadge presentations={opusCount} meta={meta} superMeta={superMeta} />
            </div>

            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => onUpdate("opus", Math.max(0, opusCount - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                min={0}
                value={opusCount}
                onChange={(e) => onUpdate("opus", parseInt(e.target.value) || 0)}
                className="text-lg font-bold text-center h-8 border-0 bg-muted/40 px-1 w-14 hide-arrows"
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => onUpdate("opus", opusCount + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${opTier.rate >= 1.0 ? "bg-success" : "bg-warning"}`} />
              <span className="text-[10px] text-muted-foreground">
                {opusCount >= superMeta
                  ? "Super Meta atingida"
                  : opusCount >= meta
                  ? "Meta atingida"
                  : `Faltam ${meta - opusCount} para meta`}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
