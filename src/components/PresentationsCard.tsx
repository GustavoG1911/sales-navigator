import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Presentation } from "lucide-react";

interface PresentationsCardProps {
  count: number;
  onChange: (count: number) => void;
}

export function PresentationsCard({ count, onChange }: PresentationsCardProps) {
  const meetsTarget = count >= 15;

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Apresentações</span>
          <Presentation className="h-4 w-4 text-primary opacity-60" />
        </div>
        <Input
          type="number"
          min={0}
          value={count}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="text-2xl font-bold tracking-tight h-10 border-0 bg-muted/40 px-2 w-20"
        />
        <div className="flex items-center gap-1.5 mt-2">
          <div className={`h-1.5 w-1.5 rounded-full ${meetsTarget ? "bg-success" : "bg-warning"}`} />
          <span className="text-xs text-muted-foreground">
            {meetsTarget ? "Meta atingida — 100%" : `Faltam ${15 - count} — 70%`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
