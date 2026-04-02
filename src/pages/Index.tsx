import { useState, useMemo } from "react";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { KpiCard } from "@/components/KpiCard";
import { PresentationsCard } from "@/components/PresentationsCard";
import { OperationsChart } from "@/components/OperationsChart";
import { DealsTable } from "@/components/DealsTable";
import { DealFormDialog } from "@/components/DealFormDialog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ReceivablesFlow } from "@/components/ReceivablesFlow";
import { PeriodFilter, DateRange } from "@/components/PeriodFilter";
import { calculateCommission, formatCurrency, getMonthKey, formatMonthLabel, getPresentationsForDeal } from "@/lib/commission";
import { downloadReportPDF, printReport } from "@/lib/report";
import { Deal, PaymentStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, TrendingUp, Wallet, BadgeDollarSign, CalendarDays, FileDown, Printer, Zap, ArrowDownToLine, BarChart3, Receipt, LogOut } from "lucide-react";

export default function Index() {
  const { deals, loading, addOrUpdateDeal, removeDeal, presentations, updatePresentations, settings, updateSettings, superMeta, toggleSuperMeta, adjustments, updateAdjustment, refreshDeals } = useAppData();
  const { signOut, user } = useAuth();

  const currentMonthKey = getMonthKey(new Date());
  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  });
  const [periodLabel, setPeriodLabel] = useState(formatMonthLabel(currentMonthKey));
  const [formOpen, setFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const handlePeriodChange = (range: DateRange, label: string) => {
    setDateRange(range);
    setPeriodLabel(label);
  };

  // Dashboard: filter by closingDate
  const filteredDeals = useMemo(
    () => deals.filter((d) => {
      const date = new Date(d.closingDate);
      return date >= dateRange.from && date <= dateRange.to;
    }),
    [deals, dateRange]
  );

  const isSingleMonth = dateRange.from.getMonth() === dateRange.to.getMonth() && dateRange.from.getFullYear() === dateRange.to.getFullYear();
  const selectedMonthKey = isSingleMonth ? getMonthKey(dateRange.from) : currentMonthKey;
  const superMetaActive = isSingleMonth ? (superMeta[selectedMonthKey] || false) : false;

  const currentMonthPres = presentations[selectedMonthKey] || { bluepex: 0, opus: 0 };

  const kpis = useMemo(() => {
    let projected = 0;
    let paid = 0;
    filteredDeals.forEach((deal) => {
      const presCount = getPresentationsForDeal(deal, presentations);
      const dealMonthKey = getMonthKey(deal.closingDate);
      const dealSuperMeta = superMeta[dealMonthKey] || false;
      const comm = calculateCommission(deal, presCount, settings, dealSuperMeta);
      projected += comm.totalCommission;
      if (deal.paymentStatus === "Pago") paid += comm.totalCommission;
    });
    const totalPres = currentMonthPres.bluepex + currentMonthPres.opus;
    return { salary: settings.fixedSalary, projected, paid, total: settings.fixedSalary + paid, presentations: totalPres };
  }, [filteredDeals, presentations, settings, superMeta, currentMonthPres]);

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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <DollarSign className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <h1 className="font-bold text-base tracking-tight">DealFlow</h1>
          </div>
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
            <Button onClick={signOut} size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-5">
        <div className="mb-4">
          <PeriodFilter onPeriodChange={handlePeriodChange} />
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList className="h-9 mb-5">
            <TabsTrigger value="dashboard" className="text-xs gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Dashboard de Vendas
            </TabsTrigger>
            <TabsTrigger value="receivables" className="text-xs gap-1.5">
              <Receipt className="h-3.5 w-3.5" />
              Fluxo de Recebíveis
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-1.5">
              Parâmetros
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-5 mt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-foreground">{periodLabel}</h2>
                <span className="text-xs text-muted-foreground">{filteredDeals.length} fechamento(s)</span>
              </div>
              {isSingleMonth && (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-warning/10 border border-warning/20">
                  <Zap className="h-3.5 w-3.5 text-warning" />
                  <Label htmlFor="super-meta" className="text-[11px] font-medium text-warning cursor-pointer">Super Meta</Label>
                  <Switch
                    id="super-meta"
                    checked={superMetaActive}
                    onCheckedChange={(checked) => toggleSuperMeta(selectedMonthKey, checked)}
                    className="scale-[0.65]"
                  />
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-widest font-semibold">Comissões geradas no período</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <KpiCard title="Salário Fixo" value={formatCurrency(kpis.salary)} icon={Wallet} />
                <KpiCard title="Projetada" value={formatCurrency(kpis.projected)} icon={TrendingUp} variant="primary" />
                <KpiCard title="Paga" value={formatCurrency(kpis.paid)} icon={BadgeDollarSign} variant="success" />
                <KpiCard title="Total Período" value={formatCurrency(kpis.total)} icon={DollarSign} variant="warning" />
                {isSingleMonth ? (
                  <PresentationsCard
                    data={currentMonthPres}
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
              superMetaActive={superMetaActive}
              onEdit={handleEdit}
              onDelete={removeDeal}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>

          <TabsContent value="receivables" className="mt-0">
            <ReceivablesFlow
              allDeals={deals}
              settings={settings}
              presentations={presentations}
              superMeta={superMeta}
              dateRange={dateRange}
              adjustments={adjustments}
              onUpdateAdjustment={updateAdjustment}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <SettingsPanel settings={settings} onSave={updateSettings} onRefreshDeals={refreshDeals} />
          </TabsContent>
        </Tabs>
      </main>

      <DealFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={addOrUpdateDeal}
        editDeal={editingDeal}
      />
    </div>
  );
}
