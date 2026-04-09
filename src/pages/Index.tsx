import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { fetchAvailableYears } from "@/lib/supabase-deals";
import { KpiCard } from "@/components/KpiCard";
import { PresentationsCard } from "@/components/PresentationsCard";
import { OperationsChart } from "@/components/OperationsChart";
import { DealsTable } from "@/components/DealsTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { DealFormDialog } from "@/components/DealFormDialog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PeriodFilter, DateRange, PeriodType } from "@/components/PeriodFilter";
import { calculateCommission, formatCurrency, getMonthKey, formatMonthLabel, getPresentationsForDeal, getPaymentDateInfo } from "@/lib/commission";
import { downloadReportPDF, printReport } from "@/lib/report";
import { Deal, PaymentStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, DollarSign, TrendingUp, BadgeDollarSign, CalendarDays, FileDown, Printer, BarChart3, HelpCircle } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

export default function Index() {
  const queryClient = useQueryClient();
  const { role, user } = useAuth();
  const { deals = [], loading, presentations, updatePresentations, settings, updateSettings, superMeta, toggleSuperMeta, addOrUpdateDeal, removeDeal } = useAppData(role, user?.email);

  // ESTADOS E DATAS (Devem vir antes de qualquer useMemo)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const selectedMonthKey = getMonthKey(selectedMonth);
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [filtroFuncionario, setFiltroFuncionario] = useState("Todos");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  const currentMonthKey = getMonthKey(new Date());
  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  });
  const [periodLabel, setPeriodLabel] = useState(formatMonthLabel(currentMonthKey));
  const [formOpen, setFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [kpiModalType, setKpiModalType] = useState<"projected" | "paid" | "deals" | null>(null);
  const [filtroOperacao, setFiltroOperacao] = useState("Todas");
  const [profiles, setProfiles] = useState<any>({});

  const periodSuffix = periodType === "month" ? "do Mês" : periodType === "quarter" ? "do Trimestre" : periodType === "year" ? "do Ano" : "do Período";

  // LOGICA DERIVADA (Somente após os estados)
  const isSingleMonth = dateRange.from.getMonth() === dateRange.to.getMonth() && dateRange.from.getFullYear() === dateRange.to.getFullYear();
  const currentMonthPres = presentations?.[selectedMonthKey] || { bluepex: 0, opus: 0 };

  const handlePeriodChange = (range: DateRange, label: string, type: PeriodType) => {
    setDateRange(range);
    setPeriodLabel(label);
    setPeriodType(type);
    if (range.from) setSelectedMonth(range.from);
  };

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

  useEffect(() => {
    fetchAvailableYears(user?.email || "").then(setAvailableYears);
  }, [user?.email]);

  // Deals filtered by CLOSING DATE (for Counts and Volume)
  const closedDeals = useMemo(
    () => deals.filter((d) => {
      const date = new Date(d.closingDate);
      const passDate = date >= dateRange.from && date <= dateRange.to;

      if (role === "admin" || role === "gestor") {
        const passOp = filtroOperacao === "Todas" || d.operation === filtroOperacao;
        const passUser = filtroFuncionario === "Todos" || d.userId === filtroFuncionario;
        return passDate && passOp && passUser;
      }
      return passDate && (!user || d.userId === user.id || !d.userId); 
    }),
    [deals, dateRange, filtroOperacao, filtroFuncionario, role, user]
  );

  const financialDeals = useMemo(
    () => deals.filter((d) => {
      const baseDate = d.firstPaymentDate || d.implantationPaymentDate || d.closingDate;
      const { monthKey } = getPaymentDateInfo(baseDate);
      const passDate = monthKey === selectedMonthKey;

      if (role === "admin" || role === "gestor") {
        const passOp = filtroOperacao === "Todas" || d.operation === filtroOperacao;
        const passUser = filtroFuncionario === "Todos" || d.userId === filtroFuncionario;
        return passDate && passOp && passUser;
      }
      return passDate && (!user || d.userId === user.id || !d.userId); 
    }),
    [deals, selectedMonthKey, filtroOperacao, filtroFuncionario, role, user]
  );

  const filteredDeals = closedDeals; // Fallback for table and other uses

  // Timeline Data for Charts
  const chartTimeline = useMemo(() => {
    const data: any[] = [];
    let start = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    
    // Safety to prevent infinite loop
    let iterations = 0;
    while (start <= end && iterations < 24) {
      iterations++;
      const mKey = getMonthKey(start);
      const mLabel = formatMonthLabel(mKey);
      
      const dealsInMonth = closedDeals.filter(d => getMonthKey(new Date(d.closingDate)) === mKey);
      const bpVol = dealsInMonth.filter(d => d.operation === "BluePex").reduce((acc, d) => acc + d.monthlyValue + d.implantationValue, 0);
      const opVol = dealsInMonth.filter(d => d.operation === "Opus Tech").reduce((acc, d) => acc + d.monthlyValue + d.implantationValue, 0);
      
      const p = presentations[mKey] || { bluepex: 0, opus: 0 };
      
      data.push({
        name: mLabel,
        monthKey: mKey,
        bluepexVolume: bpVol,
        opusVolume: opVol,
        bluepexPres: p.bluepex,
        opusPres: p.opus,
        totalVolume: bpVol + opVol,
        totalPres: p.bluepex + p.opus
      });
      
      start.setMonth(start.getMonth() + 1);
    }
    return data;
  }, [dateRange, closedDeals, presentations]);

  const volumeChartData = useMemo(() => {
    if (isSingleMonth && chartTimeline.length > 0) {
      const d = chartTimeline[0];
      return [
        { name: "BluePex", value: d.bluepexVolume, fill: "#3b82f6" },
        { name: "Opus Tech", value: d.opusVolume, fill: "#10b981" }
      ];
    }
    return chartTimeline.map(d => ({
      name: d.name,
      "BluePex": d.bluepexVolume,
      "Opus Tech": d.opusVolume
    }));
  }, [isSingleMonth, chartTimeline]);

  const presChartData = useMemo(() => {
    if (isSingleMonth && chartTimeline.length > 0) {
      const d = chartTimeline[0];
      return [
        { name: "BluePex", value: d.bluepexPres, fill: "#3b82f6" },
        { name: "Opus Tech", value: d.opusPres, fill: "#10b981" }
      ];
    }
    return chartTimeline.map(d => ({
      name: d.name,
      "BluePex": d.bluepexPres,
      "Opus Tech": d.opusPres
    }));
  }, [isSingleMonth, chartTimeline]);

  const kpis = useMemo(() => {
    let projected = 0;
    let paid = 0;
    financialDeals.forEach((deal) => {
      const presCount = getPresentationsForDeal(deal, presentations);
      const comm = calculateCommission(deal, presCount, settings, false);
      projected += comm.totalCommission;
      if (deal.paymentStatus === "Pago") paid += comm.totalCommission;
    });

    let totalVolume = 0;
    closedDeals.forEach((d) => {
      totalVolume += (d.monthlyValue + d.implantationValue);
    });

    let totalPres = 0;
    if (isSingleMonth) {
      totalPres = currentMonthPres.bluepex + currentMonthPres.opus;
    } else {
      let start = new Date(dateRange.from);
      const end = new Date(dateRange.to);
      while (start <= end) {
        const key = getMonthKey(start);
        const p = presentations[key];
        if (p) totalPres += (p.bluepex + p.opus);
        start.setMonth(start.getMonth() + 1);
      }
    }
    return { salary: settings.fixedSalary, projected, paid, totalVolume, presentations: totalPres };
  }, [financialDeals, closedDeals, presentations, settings, currentMonthPres, isSingleMonth, dateRange]);

  const handleStatusChange = async (deal: Deal, status: PaymentStatus) => {
    await addOrUpdateDeal({ ...deal, paymentStatus: status });
    queryClient.invalidateQueries({ queryKey: ["finance-data"] });
  };

  const detailDeals = useMemo(() => {
    if (!kpiModalType) return [];
    return filteredDeals.filter(d => {
      if (kpiModalType === "paid") return d.paymentStatus === "Pago";
      if (kpiModalType === "projected") return d.paymentStatus !== "Pago";
      return true;
    });
  }, [filteredDeals, kpiModalType]);

  const kpiModalTitles = {
    projected: "Comissão Projetada (Pendente)",
    paid: "Comissão Destravada (Paga)",
    deals: `Fechamentos ${periodSuffix}`,
    volume: `Volume Total ${periodSuffix}`
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
                <PeriodFilter onPeriodChange={handlePeriodChange} availableYears={availableYears} />
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
             <div className="lg:col-span-2">
                 <PresentationsCard
                   presentations={currentMonthPres}
                   onUpdate={(op, count) => updatePresentations(selectedMonthKey, op, count)}
                   settings={settings}
                 />
             </div>
             <div>
                 <SettingsPanel settings={settings} onUpdate={updateSettings} />
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
                onClick={() => setKpiModalType("deals")}
                tooltip="Volume de negócios concretizados no período selecionado."
              />
              <KpiCard 
                title={`Projetada ${periodSuffix}`} 
                value={formatCurrency(kpis.projected)} 
                icon={TrendingUp} 
                variant="primary" 
                onClick={() => setKpiModalType("projected")}
                tooltip="Soma das comissões e implantações de negócios fechados no período que ainda não foram pagos."
              />
              <KpiCard 
                title={`Paga ${periodSuffix}`} 
                value={formatCurrency(kpis.paid)} 
                icon={BadgeDollarSign} 
                variant="success" 
                onClick={() => setKpiModalType("paid")}
                tooltip="Soma das comissões e implantações que já constam como recebidas/pagas."
              />
              <KpiCard 
                title={`VOLUME ${periodSuffix.toUpperCase()}`} 
                value={formatCurrency(kpis.totalVolume)} 
                icon={DollarSign} 
                variant="warning" 
                onClick={() => setKpiModalType("deals")}
                tooltip="Valor total bruto (Mensalidade + Implantação) dos negócios fechados no período."
              />
            </div>
          </div>

          <Dialog open={!!kpiModalType} onOpenChange={(open) => !open && setKpiModalType(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{kpiModalType ? kpiModalTitles[kpiModalType] : ""}</DialogTitle>
                <DialogDescription>
                  Listagem detalhada dos negócios que compõem este KPI.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs">Operação</TableHead>
                      <TableHead className="text-xs text-right">Mensal</TableHead>
                      <TableHead className="text-xs text-right">Implantação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailDeals.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-xs py-8">Nenhum registro encontrado.</TableCell></TableRow>
                    ) : (
                      detailDeals.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(d.closingDate), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-xs font-medium">{d.clientName}</TableCell>
                          <TableCell className="text-xs">{d.operation}</TableCell>
                          <TableCell className="text-xs font-mono text-right">{formatCurrency(d.monthlyValue)}</TableCell>
                          <TableCell className="text-xs font-mono text-right">{formatCurrency(d.implantationValue)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
            {/* Volume Chart */}
            <Card className="h-[300px] flex flex-col bg-card/60">
              <CardContent className="flex-1 p-4 flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  Volume Bruto por Operação
                </span>
                <div className="flex-1 w-full relative min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                      <YAxis tickFormatter={(val) => `R$${(val/1000)}k`} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      {isSingleMonth ? (
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {volumeChartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      ) : (
                        <>
                          <Bar dataKey="BluePex" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Opus Tech" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Presentations Chart */}
            <Card className="h-[300px] flex flex-col bg-card/60">
              <CardContent className="flex-1 p-4 flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  Apresentações Realizadas {isSingleMonth ? periodSuffix : ""}
                </span>
                <div className="flex-1 w-full relative min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={presChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value} APs`, "Apresentações"]}
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      {isSingleMonth ? (
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {presChartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      ) : (
                        <>
                          <Bar dataKey="BluePex" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Opus Tech" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
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
