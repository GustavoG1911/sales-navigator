import { useState, useMemo } from "react";
import { useAppData } from "@/hooks/useAppData";
import { KpiCard } from "@/components/KpiCard";
import { PresentationsCard } from "@/components/PresentationsCard";
import { OperationsChart } from "@/components/OperationsChart";
import { DealsTable } from "@/components/DealsTable";
import { DealFormDialog } from "@/components/DealFormDialog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PeriodFilter, DateRange } from "@/components/PeriodFilter";
import { calculateCommission, formatCurrency, getMonthKey, formatMonthLabel, getPayableMonthKey } from "@/lib/commission";
import { downloadReportPDF, printReport } from "@/lib/report";
import { Deal, PaymentStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, TrendingUp, Wallet, BadgeDollarSign, CalendarDays, FileDown, Printer, Zap, ArrowDownToLine } from "lucide-react";

export default function Index() {
  const { deals, addOrUpdateDeal, removeDeal, presentations, updatePresentations, settings, updateSettings, superMeta, toggleSuperMeta } = useAppData();

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

  // Presentations for the period
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

  // KPIs: commissions EARNED in this period (paid next month)
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

  // Payable commissions: deals from PREVIOUS month(s) whose commission is payable in the selected period
  const payableData = useMemo(() => {
    if (!isSingleMonth) return { deals: [], total: 0, paidTotal: 0 };
    // Deals whose payable month = selected month
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
    // Get previous month deals for payable section
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
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Comissões</h1>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <Tabs defaultValue="dashboard">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="settings">Parâmetros</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button onClick={handleNewDeal} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Fechamento
                </Button>
                <Button onClick={handleDownloadReport} size="sm" variant="outline">
                  <FileDown className="h-4 w-4 mr-1" />
                  Relatório PDF
                </Button>
                <Button onClick={handlePrintReport} size="sm" variant="ghost">
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <PeriodFilter onPeriodChange={handlePeriodChange} />
          </div>

          <TabsContent value="dashboard" className="space-y-6 mt-0">
            {/* Period label + Super Meta toggle */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-muted-foreground">{periodLabel}</h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">{filteredDeals.length} fechamento(s)</span>
                {isSingleMonth && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <Label htmlFor="super-meta" className="text-xs font-medium text-yellow-500 cursor-pointer">Super Meta</Label>
                    <Switch
                      id="super-meta"
                      checked={superMetaActive}
                      onCheckedChange={(checked) => toggleSuperMeta(selectedMonthKey, checked)}
                      className="scale-75"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* KPI Cards - Earned this period */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium">Comissões geradas no período</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard title="Salário Fixo" value={formatCurrency(kpis.salary)} icon={Wallet} />
                <KpiCard title="Comissão Projetada" value={formatCurrency(kpis.projected)} icon={TrendingUp} variant="primary" />
                <KpiCard title="Comissão Paga" value={formatCurrency(kpis.paid)} icon={BadgeDollarSign} variant="success" />
                <KpiCard title="Total do Período" value={formatCurrency(kpis.total)} icon={DollarSign} variant="warning" />
                <KpiCard
                  title="Apresentações"
                  value={kpis.presentations.toString()}
                  icon={CalendarDays}
                  trend={isSingleMonth ? (kpis.presentations >= 15 ? "Meta atingida ✓" : `Faltam ${15 - kpis.presentations}`) : "Soma do período"}
                />
              </div>
            </div>

            {/* Payable commissions - what is to be RECEIVED this month */}
            {isSingleMonth && payableData.deals.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium flex items-center gap-1">
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  Comissões a receber este mês (fechamentos do mês anterior)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <KpiCard title="A Receber (Total)" value={formatCurrency(payableData.total)} icon={ArrowDownToLine} variant="primary" />
                  <KpiCard title="Já Pago" value={formatCurrency(payableData.paidTotal)} icon={BadgeDollarSign} variant="success" />
                  <KpiCard title="Pendente" value={formatCurrency(payableData.total - payableData.paidTotal)} icon={Wallet} />
                </div>
              </div>
            )}

            {/* Presentations + Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {isSingleMonth && (
                <PresentationsCard
                  count={presentations[getMonthKey(dateRange.from)] || 0}
                  onChange={(c) => updatePresentations(getMonthKey(dateRange.from), c)}
                />
              )}
              <div className={isSingleMonth ? "lg:col-span-2" : "lg:col-span-3"}>
                <OperationsChart deals={filteredDeals} />
              </div>
            </div>

            {/* Deals Table */}
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

          <TabsContent value="settings" className="mt-0">
            <SettingsPanel settings={settings} onSave={updateSettings} />
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
