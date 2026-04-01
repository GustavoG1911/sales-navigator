import { useState, useMemo } from "react";
import { useAppData } from "@/hooks/useAppData";
import { KpiCard } from "@/components/KpiCard";
import { PresentationsCard } from "@/components/PresentationsCard";
import { OperationsChart } from "@/components/OperationsChart";
import { DealsTable } from "@/components/DealsTable";
import { DealFormDialog } from "@/components/DealFormDialog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ReceivablesFlow } from "@/components/ReceivablesFlow";
import { PeriodFilter, DateRange } from "@/components/PeriodFilter";
import { calculateCommission, formatCurrency, getMonthKey, formatMonthLabel, getPayableMonthKey } from "@/lib/commission";
import { downloadReportPDF, printReport } from "@/lib/report";
import { Deal, PaymentStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, TrendingUp, Wallet, BadgeDollarSign, CalendarDays, FileDown, Printer, Zap, ArrowDownToLine, BarChart3, Receipt } from "lucide-react";

export default function Index() {
  const { deals, loading, addOrUpdateDeal, removeDeal, presentations, updatePresentations, settings, updateSettings, superMeta, toggleSuperMeta, adjustments, updateAdjustment, refreshDeals } = useAppData();

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

  const periodPresentations = useMemo(() => {
    let total = 0;
    const startMonth = dateRange.from.getFullYear() * 12 + dateRange.from.getMonth();
    const endMonth = dateRange.to.getFullYear() * 12 + dateRange.to.getMonth();
    for (let m = startMonth; m <= endMonth; m++) {
      const year = Math.floor(m / 12);
      const month = m % 12;
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      total += presentations[key] || 0;
    }
    return total;
  }, [presentations, dateRange]);

  const commissionPresentations = isSingleMonth
    ? (presentations[getMonthKey(dateRange.from)] || 0)
    : (presentations[currentMonthKey] || 0);

  const kpis = useMemo(() => {
    let projected = 0;
    let paid = 0;
    filteredDeals.forEach((deal) => {
      const dealMonthKey = getMonthKey(deal.closingDate);
      const dealPresentations = presentations[dealMonthKey] || 0;
      const dealSuperMeta = superMeta[dealMonthKey] || false;
      const comm = calculateCommission(deal, dealPresentations, settings, dealSuperMeta);
      projected += comm.totalCommission;
      if (deal.paymentStatus === "Pago") paid += comm.totalCommission;
    });
    return { salary: settings.fixedSalary, projected, paid, total: settings.fixedSalary + paid, presentations: periodPresentations };
  }, [filteredDeals, presentations, settings, periodPresentations, superMeta]);

  const payableData = useMemo(() => {
    if (!isSingleMonth) return { deals: [], total: 0, paidTotal: 0 };
    const payable = deals.filter((d) => {
      const payMonth = getPayableMonthKey(d.closingDate);
      return payMonth === selectedMonthKey;
    });
    let total = 0;
    let paidTotal = 0;
    payable.forEach((deal) => {
      const dealMonthKey = getMonthKey(deal.closingDate);
      const dealPres = presentations[dealMonthKey] || 0;
      const dealSuperMeta = superMeta[dealMonthKey] || false;
      const comm = calculateCommission(deal, dealPres, settings, dealSuperMeta);
      total += comm.totalCommission;
      if (deal.paymentStatus === "Pago") paidTotal += comm.totalCommission;
    });
    return { deals: payable, total, paidTotal };
  }, [deals, isSingleMonth, selectedMonthKey, presentations, settings, superMeta]);

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
    const prevMonth = new Date(dateRange.from);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthKey = getMonthKey(prevMonth);
    const payableDeals = deals.filter((d) => getMonthKey(d.closingDate) === prevMonthKey);

    downloadReportPDF({
      deals: filteredDeals,
      presentations: commissionPresentations,
      salary: settings.fixedSalary,
      periodLabel,
      settings,
      superMetaActive,
      payableDeals,
      payablePresentations: presentations[prevMonthKey] || 0,
    });
  };

  const handlePrintReport = () => {
    const prevMonth = new Date(dateRange.from);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthKey = getMonthKey(prevMonth);
    const payableDeals = deals.filter((d) => getMonthKey(d.closingDate) === prevMonthKey);

    printReport({
      deals: filteredDeals,
      presentations: commissionPresentations,
      salary: settings.fixedSalary,
      periodLabel,
      settings,
      superMetaActive,
      payableDeals,
      payablePresentations: presentations[prevMonthKey] || 0,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
          </div>
        </div>
      </header>

      <main className="container py-5">
        {/* Period filter - global */}
        <div className="mb-4">
          <PeriodFilter onPeriodChange={handlePeriodChange} />
        </div>

        {/* Main tabs */}
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
            {/* Period header with Super Meta */}
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

            {/* KPI Row */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-widest font-semibold">Comissões geradas no período</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <KpiCard title="Salário Fixo" value={formatCurrency(kpis.salary)} icon={Wallet} />
                <KpiCard title="Projetada" value={formatCurrency(kpis.projected)} icon={TrendingUp} variant="primary" />
                <KpiCard title="Paga" value={formatCurrency(kpis.paid)} icon={BadgeDollarSign} variant="success" />
                <KpiCard title="Total Período" value={formatCurrency(kpis.total)} icon={DollarSign} variant="warning" />
                {isSingleMonth ? (
                  <PresentationsCard
                    count={presentations[getMonthKey(dateRange.from)] || 0}
                    onChange={(c) => updatePresentations(getMonthKey(dateRange.from), c)}
                  />
                ) : (
                  <KpiCard
                    title="Apresentações"
                    value={kpis.presentations.toString()}
                    icon={CalendarDays}
                    trend="Soma do período"
                  />
                )}
                {isSingleMonth && (
                  <KpiCard
                    title="Meta"
                    value={kpis.presentations >= 15 ? "Atingida ✓" : `Faltam ${15 - kpis.presentations}`}
                    icon={CalendarDays}
                    trend={`${kpis.presentations}/15 apresentações`}
                    variant={kpis.presentations >= 15 ? "success" : "default"}
                  />
                )}
              </div>
            </div>

            {/* Payable commissions */}
            {isSingleMonth && payableData.deals.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-widest font-semibold flex items-center gap-1">
                  <ArrowDownToLine className="h-3 w-3" />
                  A receber este mês (mês anterior)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <KpiCard title="A Receber" value={formatCurrency(payableData.total)} icon={ArrowDownToLine} variant="primary" />
                  <KpiCard title="Já Pago" value={formatCurrency(payableData.paidTotal)} icon={BadgeDollarSign} variant="success" />
                  <KpiCard title="Pendente" value={formatCurrency(payableData.total - payableData.paidTotal)} icon={Wallet} />
                </div>
              </div>
            )}

            <OperationsChart deals={filteredDeals} />

            <DealsTable
              deals={filteredDeals}
              presentations={commissionPresentations}
              settings={settings}
              superMetaActive={superMetaActive}
              onEdit={handleEdit}
              onDelete={removeDeal}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>

          <TabsContent value="receivables" className="mt-0">
            <ReceivablesFlow
              deals={filteredDeals}
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
