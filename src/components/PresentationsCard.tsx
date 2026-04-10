import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function CounterInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        min={0}
        value={value || 0}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          onChange(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
        }}
        className="flex h-8 w-14 rounded-md bg-muted/40 px-1 text-center text-lg font-bold border-0 outline-none focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

export function PresentationsCard({ presentations, onUpdate, settings }: PresentationsCardProps) {
  const meta = 15;
  const superMeta = settings?.superMetaThreshold ?? 30;

  // Local state for immediate UI feedback — props sync back after async save
  const [bluepexCount, setBluepexCount] = useState(presentations?.bluepex ?? 0);
  const [opusCount, setOpusCount] = useState(presentations?.opus ?? 0);

  useEffect(() => {
    setBluepexCount(presentations?.bluepex ?? 0);
    setOpusCount(presentations?.opus ?? 0);
  }, [presentations?.bluepex, presentations?.opus]);

  const handleBluepexChange = (val: number) => {
    setBluepexCount(val);
    onUpdate("bluepex", val);
  };

  const handleOpusChange = (val: number) => {
    setOpusCount(val);
    onUpdate("opus", val);
  };

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
                <span className="cursor-help">
                  <HelpCircle className="h-[14px] w-[14px] text-muted-foreground/60" />
                </span>
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
            
            <CounterInput
              value={bluepexCount}
              onChange={handleBluepexChange}
            />

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

            <CounterInput
              value={opusCount}
              onChange={handleOpusChange}
            />

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
