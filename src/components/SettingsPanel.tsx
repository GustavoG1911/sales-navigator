import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AppSettings } from "@/lib/types";
import { formatCurrency } from "@/lib/commission";
import { seedHistoricalData } from "@/lib/supabase-deals";
import { Settings2, Save, Database, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onRefreshDeals?: () => void;
}

export function SettingsPanel({ settings, onSave, onRefreshDeals }: SettingsPanelProps) {
  const [salary, setSalary] = useState(settings.fixedSalary.toString());
  const [commissionRate, setCommissionRate] = useState(((settings.commissionRate || 0.20) * 100).toString());
  const [superMetaThreshold, setSuperMetaThreshold] = useState((settings.superMetaThreshold || 30).toString());
  const [superMetaMultiplier, setSuperMetaMultiplier] = useState(((settings.superMetaMultiplier || 2) * 100).toString());
  const [seeding, setSeeding] = useState(false);

  const handleSave = () => {
    onSave({
      fixedSalary: parseFloat(salary) || 0,
      commissionRate: (parseFloat(commissionRate) || 20) / 100,
      superMetaThreshold: parseInt(superMetaThreshold) || 30,
      superMetaMultiplier: (parseFloat(superMetaMultiplier) || 200) / 100,
    });
    toast.success("Parâmetros salvos com sucesso!");
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const count = await seedHistoricalData();
      toast.success(`${count} fechamentos históricos inseridos com sucesso!`);
      onRefreshDeals?.();
    } catch (err: any) {
      console.error("Seed error:", err);
      toast.error("Erro ao popular banco de dados: " + (err.message || "Erro desconhecido"));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in space-y-4">
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

          <div className="space-y-1.5">
            <Label>Taxa de Comissão (%)</Label>
            <Input type="number" min="0" max="100" step="1" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} className="font-mono text-lg" />
            <p className="text-xs text-muted-foreground">Atual: {((settings.commissionRate || 0.20) * 100).toFixed(0)}%</p>
          </div>

          <div className="pt-2 space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-1">Regras de Comissionamento</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Taxa de comissão: <strong>{((settings.commissionRate || 0.20) * 100).toFixed(0)}%</strong></li>
                <li>• ≥ 15 apresentações → base = 100% da mensalidade</li>
                <li>• {"<"} 15 apresentações → base = 70% da mensalidade</li>
                <li>• Implantação: base = 40% do valor (independente)</li>
                <li>• Comissões pagas até o <strong>dia 20 do mês subsequente</strong></li>
              </ul>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm font-medium mb-2 text-primary">⚡ Super Meta</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Apresentações necessárias</Label>
                  <Input type="number" min="1" value={superMetaThreshold} onChange={(e) => setSuperMetaThreshold(e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Multiplicador da comissão mensal (%)</Label>
                  <Input type="number" min="100" step="10" value={superMetaMultiplier} onChange={(e) => setSuperMetaMultiplier(e.target.value)} className="font-mono" />
                  <p className="text-xs text-muted-foreground">200% = comissão dobra sobre a mensalidade</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                A super meta deve ser ativada manualmente no dashboard para cada mês.
              </p>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Salvar Parâmetros
          </Button>
        </CardContent>
      </Card>

      {/* Seed Data Card */}
      <Card className="glass-card border-warning/30">
        <CardHeader>
          <CardTitle className="section-title flex items-center gap-2 text-warning">
            <Database className="h-5 w-5" />
            Popular Banco de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Insere o histórico de 11 fechamentos de 2025 diretamente no banco Supabase. Use apenas uma vez para popular os dados iniciais.
          </p>
          <Button onClick={handleSeed} disabled={seeding} variant="outline" className="w-full border-warning/40 text-warning hover:bg-warning/10">
            {seeding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Inserindo...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Popular Banco de Dados
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
