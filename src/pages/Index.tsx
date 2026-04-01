import { useState, useMemo } from "react";
import { useAppData } from "@/hooks/useAppData";
import { KpiCard } from "@/components/KpiCard";
import { PresentationsCard } from "@/components/PresentationsCard";
import { OperationsChart } from "@/components/OperationsChart";
import { DealsTable } from "@/components/DealsTable";
import { DealFormDialog } from "@/components/DealFormDialog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PeriodFilter, DateRange } from "@/components/PeriodFilter";
import { calculateCommission, formatCurrency, getMonthKey, formatMonthLabel } from "@/lib/commission";
import { downloadReport, printReport } from "@/lib/report";
import { Deal, PaymentStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, TrendingUp, Wallet, BadgeDollarSign, CalendarDays, FileDown, Printer } from "lucide-react";

export default function Index() {
  const { deals, addOrUpdateDeal, removeDeal, presentations, updatePresentations, settings, updateSettings } = useAppData();

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

  // For presentations, aggregate all months in range
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

  // For commission calc, use current month presentations (single-month context)
  const currentMonthPresentations = presentations[currentMonthKey] || 0;

  // Determine presentation count for commission: if single month, use that month's presentations
  const isSingleMonth = dateRange.from.getMonth() === dateRange.to.getMonth() && dateRange.from.getFullYear() === dateRange.to.getFullYear();
  const commissionPresentations = isSingleMonth
    ? (presentations[getMonthKey(dateRange.from)] || 0)
    : currentMonthPresentations;

  const kpis = useMemo(() => {
    let projected = 0;
    let paid = 0;
    filteredDeals.forEach((deal) => {
      // For each deal, use presentations from its closing month
      const dealMonthKey = getMonthKey(deal.closingDate);
      const dealPresentations = presentations[dealMonthKey] || 0;
      const comm = calculateCommission(deal, dealPresentations);
      projected += comm.totalCommission;
      if (deal.paymentStatus === "Pago") paid += comm.totalCommission;
    });
    return {
      salary: settings.fixedSalary,
      projected,
      paid,
      total: settings.fixedSalary + paid,
      presentations: periodPresentations,
    };
  }, [filteredDeals, presentations, settings.fixedSalary, periodPresentations]);

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
    downloadReport({
      deals: filteredDeals,
      presentations: commissionPresentations,
      salary: settings.fixedSalary,
      periodLabel,
    });
  };

  const handlePrintReport = () => {
    printReport({
      deals: filteredDeals,
      presentations: commissionPresentations,
      salary: settings.fixedSalary,
      periodLabel,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                  Relatório
                </Button>
                <Button onClick={handlePrintReport} size="sm" variant="ghost">
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <PeriodFilter onPeriodChange={handlePeriodChange} />
          </div>

          <TabsContent value="dashboard" className="space-y-6 mt-0">
            {/* Period label */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-muted-foreground">{periodLabel}</h2>
              <span className="text-sm text-muted-foreground">{filteredDeals.length} fechamento(s)</span>
            </div>

            {/* KPI Cards */}
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
