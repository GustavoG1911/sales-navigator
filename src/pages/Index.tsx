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
import { Plus, DollarSign, TrendingUp, Wallet, BadgeDollarSign, CalendarDays, FileDown, Printer, BarChart3 } from "lucide-react";

export default function Index() {
  const { deals, loading, addOrUpdateDeal, removeDeal, presentations, updatePresentations, settings, updateSettings, superMeta, adjustments, updateAdjustment, refreshDeals } = useAppData();
  const { signOut, role } = useAuth();

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

  const filteredDeals = useMemo(
    () => deals.filter((d) => {
      const date = new Date(d.closingDate);
      return date >= dateRange.from && date <= dateRange.to;
    }),
    [deals, dateRange]
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
      <div className="mb-4 flex items-center justify-between">
        <PeriodFilter onPeriodChange={handlePeriodChange} />
        <div className="flex items-center gap-2">
          <Button onClick={handleNewDeal} size="sm" className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Novo Fechamento
          </Button>
          <Button onClick={handleDownloadReport} size="sm" variant="outline" className="h-8 text-xs">
            <FileDown className="h-3.5 w-3.5 mr-1" />
            PDF
          </Button>
          <Button onClick={handlePrintReport} size="sm" variant="ghost" className="h-8 w-8 p-0">
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
            <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-widest font-semibold">Comissões geradas no período</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard title="Salário Fixo" value={formatCurrency(kpis.salary)} icon={Wallet} />
              <KpiCard title={`Projetada ${periodSuffix}`} value={formatCurrency(kpis.projected)} icon={TrendingUp} variant="primary" />
              <KpiCard title={`Paga ${periodSuffix}`} value={formatCurrency(kpis.paid)} icon={BadgeDollarSign} variant="success" />
              <KpiCard title={`Total ${periodSuffix}`} value={formatCurrency(kpis.total)} icon={DollarSign} variant="warning" />
              {isSingleMonth ? (
                <PresentationsCard
                  data={currentMonthPres}
                  globalParams={globalParams}
                  onChangeBluepex={(c) => updatePresentations(selectedMonthKey, "bluepex", c)}
                  onChangeOpus={(c) => updatePresentations(selectedMonthKey, "opus", c)}
                />
              ) : (
                <KpiCard
                  title="Apresentações"
                  value={kpis.presentations.toString()}
                  icon={CalendarDays}
                  trend="Soma do período"
                />
              )}
            </div>
          </div>

          <OperationsChart deals={filteredDeals} />

          <DealsTable
            deals={filteredDeals}
            presentations={presentations}
            settings={settings}
            superMetaActive={false}
            onEdit={handleEdit}
            onDelete={removeDeal}
            onStatusChange={handleStatusChange}
          />
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
