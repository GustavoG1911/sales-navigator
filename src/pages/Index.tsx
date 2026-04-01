import { useState, useMemo } from "react";
import { useAppData } from "@/hooks/useAppData";
import { KpiCard } from "@/components/KpiCard";
import { PresentationsCard } from "@/components/PresentationsCard";
import { OperationsChart } from "@/components/OperationsChart";
import { DealsTable } from "@/components/DealsTable";
import { DealFormDialog } from "@/components/DealFormDialog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { MonthFilter } from "@/components/MonthFilter";
import { calculateCommission, formatCurrency, getMonthKey } from "@/lib/commission";
import { Deal, PaymentStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, TrendingUp, Wallet, BadgeDollarSign, CalendarDays } from "lucide-react";

export default function Index() {
  const { deals, addOrUpdateDeal, removeDeal, presentations, updatePresentations, settings, updateSettings } = useAppData();

  const currentMonthKey = getMonthKey(new Date());
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const availableMonths = useMemo(() => {
    const months = new Set<string>([currentMonthKey]);
    deals.forEach((d) => months.add(getMonthKey(d.closingDate)));
    // Add prev/next months
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    months.add(getMonthKey(d));
    d.setMonth(d.getMonth() + 2);
    months.add(getMonthKey(d));
    return Array.from(months).sort().reverse();
  }, [deals, currentMonthKey]);

  const monthDeals = useMemo(
    () => deals.filter((d) => getMonthKey(d.closingDate) === selectedMonth),
    [deals, selectedMonth]
  );

  const monthPresentations = presentations[selectedMonth] || 0;

  const kpis = useMemo(() => {
    let projected = 0;
    let paid = 0;
    monthDeals.forEach((deal) => {
      const comm = calculateCommission(deal, monthPresentations);
      projected += comm.totalCommission;
      if (deal.paymentStatus === "Pago") paid += comm.totalCommission;
    });
    return {
      salary: settings.fixedSalary,
      projected,
      paid,
      total: settings.fixedSalary + paid,
      presentations: monthPresentations,
    };
  }, [monthDeals, monthPresentations, settings.fixedSalary]);

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="settings">Parâmetros</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <MonthFilter value={selectedMonth} onChange={setSelectedMonth} availableMonths={availableMonths} />
              <Button onClick={handleNewDeal} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Novo Fechamento
              </Button>
            </div>
          </div>

          <TabsContent value="dashboard" className="space-y-6 mt-0">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <KpiCard title="Salário Fixo" value={formatCurrency(kpis.salary)} icon={Wallet} />
              <KpiCard title="Comissão Projetada" value={formatCurrency(kpis.projected)} icon={TrendingUp} variant="primary" />
              <KpiCard title="Comissão Paga" value={formatCurrency(kpis.paid)} icon={BadgeDollarSign} variant="success" />
              <KpiCard title="Total do Mês" value={formatCurrency(kpis.total)} icon={DollarSign} variant="warning" />
              <KpiCard
                title="Apresentações"
                value={kpis.presentations.toString()}
                icon={CalendarDays}
                trend={kpis.presentations >= 15 ? "Meta atingida ✓" : `Faltam ${15 - kpis.presentations}`}
              />
            </div>

            {/* Presentations + Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <PresentationsCard
                count={monthPresentations}
                onChange={(c) => updatePresentations(selectedMonth, c)}
              />
              <div className="lg:col-span-2">
                <OperationsChart deals={monthDeals} />
              </div>
            </div>

            {/* Deals Table */}
            <DealsTable
              deals={monthDeals}
              presentations={monthPresentations}
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
