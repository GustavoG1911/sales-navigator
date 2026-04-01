import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Presentation } from "lucide-react";

interface PresentationsCardProps {
  count: number;
  onChange: (count: number) => void;
}

export function PresentationsCard({ count, onChange }: PresentationsCardProps) {
  const meetsTarget = count >= 15;

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="section-title flex items-center gap-2">
          <Presentation className="h-4 w-4 text-primary" />
          Apresentações do Mês
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="number"
          min={0}
          value={count}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="font-mono text-lg"
        />
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${meetsTarget ? "bg-success" : "bg-warning"}`} />
          <span className="text-sm text-muted-foreground">
            {meetsTarget
              ? "Meta atingida — comissão 100%"
              : `Faltam ${15 - count} para meta — comissão 70%`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
