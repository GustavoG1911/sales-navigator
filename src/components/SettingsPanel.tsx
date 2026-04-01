import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AppSettings } from "@/lib/types";
import { formatCurrency } from "@/lib/commission";
import { Settings2, Save } from "lucide-react";
import { toast } from "sonner";

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
}

export function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [salary, setSalary] = useState(settings.fixedSalary.toString());

  const handleSave = () => {
    onSave({ fixedSalary: parseFloat(salary) || 0 });
    toast.success("Parâmetros salvos com sucesso!");
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="section-title flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Parâmetros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Salário Fixo Mensal (R$)</Label>
            <Input type="number" min="0" step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} className="font-mono text-lg" />
            <p className="text-xs text-muted-foreground">Atual: {formatCurrency(settings.fixedSalary)}</p>
          </div>

          <div className="pt-2 space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-1">Regras de Comissionamento</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Taxa de comissão: <strong>20%</strong></li>
                <li>• ≥ 15 apresentações → base = 100% da mensalidade</li>
                <li>• {"<"} 15 apresentações → base = 70% da mensalidade</li>
                <li>• Implantação: base = 40% do valor (independente)</li>
              </ul>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Salvar Parâmetros
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
