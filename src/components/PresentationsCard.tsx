import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OperationPresentations } from "@/lib/types";

interface PresentationsCardProps {
  data: OperationPresentations;
  onChangeBluepex: (count: number) => void;
  onChangeOpus: (count: number) => void;
}

export function PresentationsCard({ data, onChangeBluepex, onChangeOpus }: PresentationsCardProps) {
  const bpMet = data.bluepex >= 15;
  const opMet = data.opus >= 15;

  return (
    <Card className="glass-card col-span-2">
      <CardContent className="p-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
          Apresentações por Operação
        </span>
        <div className="grid grid-cols-2 gap-4">
          {/* BluePex */}
          <div>
            <label className="text-[11px] font-semibold text-blue-500 mb-1 block">BluePex</label>
            <Input
              type="number"
              min={0}
              value={data.bluepex}
              onChange={(e) => onChangeBluepex(Math.max(0, parseInt(e.target.value) || 0))}
              className="text-xl font-bold tracking-tight h-9 border-0 bg-muted/40 px-2 w-20"
            />
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${bpMet ? "bg-success" : "bg-warning"}`} />
              <span className="text-[10px] text-muted-foreground">
                {bpMet ? "Meta atingida — 100%" : `Faltam ${15 - data.bluepex} — 70%`}
              </span>
            </div>
          </div>
          {/* Opus Tech */}
          <div>
            <label className="text-[11px] font-semibold text-purple-500 mb-1 block">Opus Tech</label>
            <Input
              type="number"
              min={0}
              value={data.opus}
              onChange={(e) => onChangeOpus(Math.max(0, parseInt(e.target.value) || 0))}
              className="text-xl font-bold tracking-tight h-9 border-0 bg-muted/40 px-2 w-20"
            />
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${opMet ? "bg-success" : "bg-warning"}`} />
              <span className="text-[10px] text-muted-foreground">
                {opMet ? "Meta atingida — 100%" : `Faltam ${15 - data.opus} — 70%`}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
