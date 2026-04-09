import { useState, useMemo, useEffect } from "react";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { KpiCard } from "@/components/KpiCard";
import { PresentationsCard } from "@/components/PresentationsCard";
import { OperationsChart } from "@/components/OperationsChart";
import { DealsTable } from "@/components/DealsTable";
import { DealFormDialog } from "@/components/DealFormDialog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PeriodFilter, DateRange, PeriodType } from "@/components/PeriodFilter";
import { calculateCommission, formatCurrency, getMonthKey, formatMonthLabel, getPresentationsForDeal } from "@/lib/commission";
import { downloadReportPDF, printReport } from "@/lib/report";
import { Deal, PaymentStatus, GlobalParameters } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, DollarSign, TrendingUp, BadgeDollarSign, CalendarDays, FileDown, Printer, BarChart3, HelpCircle } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Index() {
  const { deals, loading, addOrUpdateDeal, removeDeal, presentations, updatePresentations, settings, updateSettings, superMeta, adjustments, updateAdjustment, refreshDeals } = useAppData();
  const { signOut, role, user } = useAuth();

  const [globalParams, setGlobalParams] = useState<GlobalParameters | undefined>(undefined);

  useEffect(() => {
    supabase
      .from("global_parameters")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setGlobalParams({
            id: data.id,
            meta_apresentacoes_bluepex: data.meta_apresentacoes_bluepex ?? 15,
            meta_apresentacoes_opus: data.meta_apresentacoes_opus ?? 15,
            super_meta_bluepex: data.super_meta_bluepex ?? 30,
            super_meta_opus: data.super_meta_opus ?? 30,
            base_implantacao: data.base_implantacao ?? 40,
            acelerador_teto: data.acelerador_teto ?? 100,
            acelerador_piso: data.acelerador_piso ?? 70,
          });
        }
      });
  }, []);

  const currentMonthKey = getMonthKey(new Date());
  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  });
  const [periodLabel, setPeriodLabel] = useState(formatMonthLabel(currentMonthKey));
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [formOpen, setFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const periodSuffix = periodType === "month" ? "do Mês" : periodType === "quarter" ? "do Trimestre" : periodType === "year" ? "do Ano" : "do Período";

  const handlePeriodChange = (range: DateRange, label: string, type: PeriodType) => {
    setDateRange(range);
    setPeriodLabel(label);
    setPeriodType(type);
  };

  const [filtroOperacao, setFiltroOperacao] = useState("Todas");
  const [filtroFuncionario, setFiltroFuncionario] = useState("Todos");
  const [profiles, setProfiles] = useState<any>({});

  useEffect(() => {
    if (role === "admin" || role === "gestor") {
      supabase.from("profiles").select("user_id, full_name").then(({ data }) => {
        if (data) {
          const map: any = {};
          data.forEach(p => map[p.user_id] = p.full_name);
          setProfiles(map);
        }
      });
    }
  }, [role]);

  const filteredDeals = useMemo(
    () => deals.filter((d) => {
      const date = new Date(d.closingDate);
      const passDate = date >= dateRange.from && date <= dateRange.to;

      if (role === "admin" || role === "gestor") {
        const passOp = filtroOperacao === "Todas" || d.operation === filtroOperacao;
        const passUser = filtroFuncionario === "Todos" || d.userId === filtroFuncionario;
        return passDate && passOp && passUser;
      }

      // User restricted view logic
      return passDate && (!user || d.userId === user.id || !d.userId); 
    }),
    [deals, dateRange, filtroOperacao, filtroFuncionario, role, user]
  );

  const isSingleMonth = dateRange.from.getMonth() === dateRange.to.getMonth() && dateRange.from.getFullYear() === dateRange.to.getFullYear();
  const selectedMonthKey = isSingleMonth ? getMonthKey(dateRange.from) : currentMonthKey;

  const currentMonthPres = presentations[selectedMonthKey] || { bluepex: 0, opus: 0 };

  const kpis = useMemo(() => {
    let projected = 0;
    let paid = 0;
    filteredDeals.forEach((deal) => {
      const presCount = getPresentationsForDeal(deal, presentations);
      const comm = calculateCommission(deal, presCount, settings, false, globalParams);
      projected += comm.totalCommission;
      if (deal.paymentStatus === "Pago") paid += comm.totalCommission;
    });
    const totalPres = currentMonthPres.bluepex + currentMonthPres.opus;
    return { salary: settings.fixedSalary, projected, paid, total: settings.fixedSalary + paid, presentations: totalPres };
  }, [filteredDeals, presentations, settings, globalParams, currentMonthPres]);

  const handleStatusChange = (deal: Deal, status: PaymentStatus) => {
    addOrUpdateDeal({ ...deal, paymentStatus: status });
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setFormOpen(true);
  };

  const handleNewDeal = () => {
    setEditingDeal(null);
    setFormOpen(true);
  };

  const handleDownloadReport = () => {
    downloadReportPDF({
      deals: filteredDeals,
      presentations,
      salary: settings.fixedSalary,
      periodLabel,
      settings,
      superMeta,
    });
  };

  const handlePrintReport = () => {
    printReport({
      deals: filteredDeals,
      presentations,
      salary: settings.fixedSalary,
      periodLabel,
      settings,
      superMeta,
    });
  };

  return (
    <div className="container py-5">
      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-4 w-full md:w-auto">
          
          {(role === "admin" || role === "gestor") && (
            <Card className="bg-muted/30">
              <CardContent className="p-4 flex flex-wrap items-center gap-4">
                <PeriodFilter onPeriodChange={handlePeriodChange} />
                <Select value={filtroOperacao} onValueChange={setFiltroOperacao}>
                  <SelectTrigger className="w-[140px] md:w-[160px] h-9 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Operação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas Operações</SelectItem>
                    <SelectItem value="BluePex">BluePex</SelectItem>
                    <SelectItem value="Opus Tech">Opus Tech</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
                  <SelectTrigger className="w-[140px] md:w-[160px] h-9 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos Funcionários</SelectItem>
                    {Object.entries(profiles).map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {role === "user" && (
            <div className="flex items-center">
              <PeriodFilter onPeriodChange={handlePeriodChange} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleNewDeal} size="sm" className="h-9 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Novo Fechamento
          </Button>
          <Button onClick={handleDownloadReport} size="sm" variant="outline" className="h-9 text-xs">
            <FileDown className="h-3.5 w-3.5 mr-1" />
            PDF
          </Button>
          <Button onClick={handlePrintReport} size="sm" variant="ghost" className="h-9 w-9 p-0">
            <Printer className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="h-9 mb-5">
          <TabsTrigger value="dashboard" className="text-xs gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Dashboard de Vendas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-5 mt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-foreground">{periodLabel}</h2>
              <span className="text-xs text-muted-foreground">{filteredDeals.length} fechamento(s)</span>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-widest font-semibold flex items-center gap-2">
              Comissões geradas no período
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard 
                title={`FECHAMENTOS ${periodSuffix.toUpperCase()}`}
                value={filteredDeals.length.toString()} 
                icon={BarChart3} 
                onClick={() => {
                  const el = document.getElementById("deals-table-container");
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                tooltip="Volume de negócios concretizados no período selecionado."
              />
              <KpiCard 
                title={`Projetada ${periodSuffix}`} 
                value={formatCurrency(kpis.projected)} 
                icon={TrendingUp} 
                variant="primary" 
                tooltip="Soma das comissões e implantações de negócios fechados no período que ainda não foram pagos."
              />
              <KpiCard 
                title={`Paga ${periodSuffix}`} 
                value={formatCurrency(kpis.paid)} 
                icon={BadgeDollarSign} 
                variant="success" 
                tooltip="Soma das comissões e implantações que já constam como recebidas/pagas."
              />
              <KpiCard 
                title={`Total ${periodSuffix}`} 
                value={formatCurrency(kpis.total)} 
                icon={DollarSign} 
                variant="warning" 
                tooltip="Montante bruto geral (Pago + Projetado) gerado no período."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
            <Card className="h-[300px] flex items-center justify-center bg-muted/20 border-dashed">
              <CardContent className="text-muted-foreground font-medium">
                [Volume por Operação - Wireframe Gráfico de BI]
              </CardContent>
            </Card>
            <Card className="h-[300px] flex items-center justify-center bg-muted/20 border-dashed">
              <CardContent className="text-muted-foreground font-medium">
                [Apresentações - Wireframe Gráfico de BI]
              </CardContent>
            </Card>
          </div>

          <div id="deals-table-container">
            <DealsTable
              deals={filteredDeals}
              presentations={presentations}
              settings={settings}
              superMetaActive={false}
              onEdit={handleEdit}
              onDelete={removeDeal}
              onStatusChange={handleStatusChange}
            />
          </div>
        </TabsContent>
      </Tabs>

      <DealFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={addOrUpdateDeal}
        editDeal={editingDeal}
      />
    </div>
  );
}
