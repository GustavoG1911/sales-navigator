import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/hooks/useAppData";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownToLine, ArrowUpFromLine, Check, Loader2, DollarSign, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, getMonthKey, formatMonthLabel, getPaymentDateInfo, getCommissionTier } from "@/lib/commission";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DealRow {
  id: string;
  client_name: string;
  operation: string;
  monthly_value: number;
  implantation_value: number;
  closing_date: string;
  first_payment_date: string | null;
  implantation_payment_date: string | null;
  is_installment: boolean;
  installment_count: number;
  installment_dates: any;
  is_mensalidade_paid_by_client: boolean;
  is_implantacao_paid_by_client: boolean;
  is_mensalidade_paid: boolean;
  is_implantacao_paid: boolean;
  is_commission_liberated: boolean;
  is_paid_to_user: boolean;
  user_id: string;
  payment_status: string;
  mensalidade_payment_date: string | null;
  implantacao_payment_date: string | null;
  user_payment_date?: string | null; // Added
}

interface SalaryRow {
  id: string;
  user_id: string;
  reference_month: string;
  amount: number;
  expected_payment_date: string;
  is_paid_by_gestor: boolean;
  user_confirmed_receipt: boolean;
  payment_date: string | null;
}

interface ProfileMap {
  [userId: string]: { full_name: string; display_name: string; commission_percent: number };
}

function buildMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -6; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = getMonthKey(d);
    options.push({ value: key, label: formatMonthLabel(key) });
  }
  return options;
}

export default function Financeiro() {
  const { role, user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (role === "user" && user) {
    return <UserFinanceiroContent userId={user.id} />;
  }

  return <FinanceiroContent />;
}

function UserFinanceiroContent({ userId }: { userId: string }) {
  const currentMonthKey = getMonthKey(new Date());
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  
  const { presentations } = useAppData();

  const { data, isLoading: loading } = useQuery({
    queryKey: ["user-finance-data", userId],
    queryFn: async () => {
      const [dealsRes, salariesRes, profilesRes] = await Promise.all([
        supabase.from("deals").select("*").eq("user_id", userId).order("closing_date", { ascending: false }),
        supabase.from("salary_payments").select("*").eq("user_id", userId),
        supabase.from("profiles").select("user_id, full_name, display_name, commission_percent").eq("user_id", userId),
      ]);

      if (dealsRes.error) throw dealsRes.error;
      if (salariesRes.error) throw salariesRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const map: ProfileMap = {};
      (profilesRes.data as any[]).forEach((p) => {
        map[p.user_id] = {
          full_name: p.full_name || p.display_name || "—",
          display_name: p.display_name || "",
          commission_percent: p.commission_percent || 20,
        };
      });

      return {
        deals: dealsRes.data as any[],
        salaries: salariesRes.data as any[],
        profiles: map,
      };
    }
  });

  const deals = data?.deals || [];
  const salaries = data?.salaries || [];
  const profiles = data?.profiles || {};

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      // Regra de Corte (<= 7)
      const baseDate = d.first_payment_date || d.implantation_payment_date || d.closing_date;
      const { monthKey } = getPaymentDateInfo(baseDate);
      return monthKey === selectedMonth;
    });
  }, [deals, selectedMonth]);

  const filteredSalaries = useMemo(() => {
    return salaries.filter((s) => getMonthKey(s.reference_month) === selectedMonth);
  }, [salaries, selectedMonth]);

  const payableDeals = useMemo(() => {
    return filteredDeals.filter((d) => d.is_mensalidade_paid_by_client || d.is_implantacao_paid_by_client);
  }, [filteredDeals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const getUserName = (id: string) => profiles[id]?.full_name || "—";

  return (
    <div className="container py-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold">Meu Fluxo Individual</h2>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Minhas Comissões (Destravadas)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[11px]">Cliente</TableHead>
                  <TableHead className="text-[11px]">Operação</TableHead>
                  <TableHead className="text-[11px] text-right">Com. Mensalidade</TableHead>
                  <TableHead className="text-[11px] text-right">Com. Implantação</TableHead>
                  <TableHead className="text-[11px] text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payableDeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                      Nenhuma comissão destravada para este mês.
                    </TableCell>
                  </TableRow>
                ) : (
                  payableDeals.map((deal) => {
                    const commPercent = (profiles[deal.user_id]?.commission_percent || 20) / 100;
                    const mensalComm = deal.is_mensalidade_paid_by_client ? deal.monthly_value * commPercent : 0;
                    const implComm = deal.is_implantacao_paid_by_client ? deal.implantation_value * 0.4 * commPercent : 0;
                    const totalDeals = mensalComm + implComm;

                    return (
                      <TableRow key={deal.id}>
                        <TableCell className="text-sm">{deal.client_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{deal.operation}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {mensalComm > 0 ? formatCurrency(mensalComm) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {implComm > 0 ? formatCurrency(implComm) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {deal.is_paid_to_user ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                              <Check className="h-3 w-3 mr-1" /> Recebido
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-500/30 bg-yellow-500/10">A Receber</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Meu Salário Fixo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[11px]">Origem</TableHead>
                  <TableHead className="text-[11px] text-right">Valor</TableHead>
                  <TableHead className="text-[11px]">Vencimento</TableHead>
                  <TableHead className="text-[11px] text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                      Nenhum salário registrado para este mês.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSalaries.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Badge variant="secondary" className="text-[9px] uppercase">BDtech</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono">{formatCurrency(s.amount)}</TableCell>
                      <TableCell className="text-sm">{new Date(s.expected_payment_date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-center">
                        {s.is_paid_by_gestor ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                              <Check className="h-3 w-3 mr-1" /> Recebido
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-500/30 bg-yellow-500/10">A Receber</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FinanceiroContent() {
  const currentMonthKey = getMonthKey(new Date());
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [filtroOperacao, setFiltroOperacao] = useState("Todas");
  const [filtroFuncionario, setFiltroFuncionario] = useState("Todos");
  
  const monthOptions = useMemo(() => buildMonthOptions(), []);

  const queryClient = useQueryClient();
  const { presentations } = useAppData();

  const { data, isLoading: loading } = useQuery({
    queryKey: ["finance-data"],
    queryFn: async () => {
      const [dealsRes, salariesRes, profilesRes, gpRes] = await Promise.all([
        supabase.from("deals").select("*").order("closing_date", { ascending: false }),
        supabase.from("salary_payments").select("*"),
        supabase.from("profiles").select("user_id, full_name, display_name, commission_percent"),
        supabase.from("global_parameters").select("*").limit(1).maybeSingle(),
      ]);

      if (dealsRes.error) throw dealsRes.error;
      if (salariesRes.error) throw salariesRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const map: ProfileMap = {};
      (profilesRes.data as any[]).forEach((p) => {
        map[p.user_id] = {
          full_name: p.full_name || p.display_name || "—",
          display_name: p.display_name || "",
          commission_percent: p.commission_percent || 20,
        };
      });

      return {
        deals: dealsRes.data as any[],
        salaries: salariesRes.data as any[],
        profiles: map,
        globalParams: gpRes.data,
      };
    }
  });

  const deals = data?.deals || [];
  const salaries = data?.salaries || [];
  const profiles = data?.profiles || {};
  const globalParams = data?.globalParams || null;

  // Filter deals relevant to selected month and cross-filters
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      // Month - using getPaymentDateInfo (Rule of 7)
      const baseDate = d.first_payment_date || d.implantation_payment_date || d.closing_date;
      const { monthKey } = getPaymentDateInfo(baseDate);
      const passMonth = monthKey === selectedMonth;

      // Operation
      const passOp = filtroOperacao === "Todas" || d.operation === filtroOperacao;

      // User
      const passUser = filtroFuncionario === "Todos" || d.user_id === filtroFuncionario;

      return passMonth && passOp && passUser;
    });
  }, [deals, selectedMonth, filtroOperacao, filtroFuncionario]);

  const filteredSalaries = useMemo(() => {
    return salaries.filter((s) => {
      const passMonth = getMonthKey(s.reference_month) === selectedMonth;
      const passUser = filtroFuncionario === "Todos" || s.user_id === filtroFuncionario;
      return passMonth && passUser;
    });
  }, [salaries, selectedMonth, filtroFuncionario]);

  // KPI Calculations based on filtered lists
  const kpis = useMemo(() => {
    const totalFixo = filteredSalaries.reduce((acc, s) => acc + s.amount, 0);

    let totalProjetado = 0;
    let totalPago = 0;
    let volumeTotal = 0;

    const bpMeta = globalParams?.meta_apresentacoes_bluepex || 15;
    const bpSuperMeta = globalParams?.super_meta_bluepex || 30;
    const opMeta = globalParams?.meta_apresentacoes_opus || 15;
    const opSuperMeta = globalParams?.super_meta_opus || 30;

    filteredDeals.forEach((deal) => {
      // Only count if it's due this month according to the cut-off rule
      const baseDate = deal.first_payment_date || deal.implantation_payment_date || deal.closing_date;
      const { monthKey } = getPaymentDateInfo(baseDate);
      if (monthKey !== selectedMonth) return;

      volumeTotal += deal.monthly_value + deal.implantation_value;

      const presMonth = presentations[monthKey] || { bluepex: 0, opus: 0 };
      const presCount = deal.operation === "BluePex" ? presMonth.bluepex : presMonth.opus;
      const meta = deal.operation === "BluePex" ? bpMeta : opMeta;
      const smeta = deal.operation === "BluePex" ? bpSuperMeta : opSuperMeta;

      const tier = getCommissionTier(presCount, meta, smeta);
      const commissionRate = (profiles[deal.user_id]?.commission_percent || 20) / 100;

      const baseMonthlyComm = (deal.monthly_value * Math.min(tier.rate, 1.0)) * commissionRate;
      const baseImplComm = (deal.implantation_value * 0.4) * commissionRate;
      const superMetaBonus = tier.rate >= 2.0 ? baseMonthlyComm : 0;

      const dealComiss = baseMonthlyComm + baseImplComm + superMetaBonus;

      if (deal.is_paid_to_user) {
        totalPago += dealComiss;
      } else {
        totalProjetado += dealComiss;
      }
    });

    return { totalFixo, totalProjetado, totalPago, volumeTotal };
  }, [filteredDeals, filteredSalaries, selectedMonth, globalParams, presentations, profiles]);

  // Deals with confirmed client payment (ready for payout)
  const payableDeals = useMemo(() => {
    return filteredDeals.filter((d) => d.is_mensalidade_paid_by_client || d.is_implantacao_paid_by_client);
  }, [filteredDeals]);

  const handleConfirmMensalidade = async (dealId: string) => {
    const { error } = await supabase
      .from("deals")
      .update({ is_mensalidade_paid_by_client: true } as any)
      .eq("id", dealId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Recebimento de mensalidade confirmado!");
    queryClient.invalidateQueries({ queryKey: ["finance-data"] });
  };

  const handleConfirmImplantacao = async (dealId: string) => {
    const { error } = await supabase
      .from("deals")
      .update({ is_implantacao_paid_by_client: true } as any)
      .eq("id", dealId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Recebimento de implantação confirmado!");
    queryClient.invalidateQueries({ queryKey: ["finance-data"] });
  };

  const handleConfirmInstallment = async (dealId: string, index: number, checked: boolean) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    const dates = Array.isArray(deal.installment_dates) ? [...deal.installment_dates] : [];
    if (dates[index]) {
      dates[index] = { ...dates[index], paid: checked };
    }
    const { error } = await supabase
      .from("deals")
      .update({ installment_dates: dates } as any)
      .eq("id", dealId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(checked ? "Parcela confirmada!" : "Parcela desmarcada");
    queryClient.invalidateQueries({ queryKey: ["finance-data"] });
  };

  const handleToggleCommissionPayment = async (dealId: string, currentStatus: boolean, specificDate?: string) => {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from("deals")
      .update({ 
        is_paid_to_user: newStatus,
        user_payment_date: newStatus ? (specificDate || new Date().toISOString()) : null
      } as any)
      .eq("id", dealId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(newStatus ? "Comissão paga com sucesso!" : "Baixa de comissão desmarcada");
    queryClient.invalidateQueries({ queryKey: ["finance-data"] });
  };

  const handleToggleSalaryPayment = async (salaryId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from("salary_payments")
      .update({ is_paid_by_gestor: newStatus, payment_date: newStatus ? new Date().toISOString() : null } as any)
      .eq("id", salaryId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(newStatus ? "Salário marcado como pago com sucesso!" : "Baixa de salário desmarcada");
    queryClient.invalidateQueries({ queryKey: ["finance-data"] });
  };

  const getUserName = (userId: string) => profiles[userId]?.full_name || "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
        <h2 className="text-lg font-semibold whitespace-nowrap">Torre de Controle</h2>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          <Select value={filtroOperacao} onValueChange={setFiltroOperacao}>
            <SelectTrigger className="w-[140px] md:w-[160px] h-8 text-xs">
              <SelectValue placeholder="Operação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas Operações</SelectItem>
              <SelectItem value="BluePex">BluePex</SelectItem>
              <SelectItem value="Opus Tech">Opus Tech</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
            <SelectTrigger className="w-[140px] md:w-[160px] h-8 text-xs">
              <SelectValue placeholder="Funcionário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos Funcionários</SelectItem>
              {Object.entries(profiles).map(([id, p]) => (
                <SelectItem key={id} value={id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] md:w-[160px] h-8 text-xs">
              <SelectValue placeholder="Mês Referência" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card">
          <CardHeader className="py-3 px-4 pb-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
              Volume Bruto (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="text-xl font-bold tracking-tight">{formatCurrency(kpis.volumeTotal)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-emerald-500/20">
          <CardHeader className="py-3 px-4 pb-0">
            <CardTitle className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 uppercase tracking-wide">
              <Check className="h-3.5 w-3.5" /> Pago/Recebido
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="text-xl font-bold tracking-tight text-emerald-600">{formatCurrency(kpis.totalPago)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-yellow-500/20">
          <CardHeader className="py-3 px-4 pb-0">
            <CardTitle className="text-xs font-semibold text-yellow-600 flex items-center gap-1.5 uppercase tracking-wide">
              <ArrowDownToLine className="h-3.5 w-3.5" /> Projetado (Pendente)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="text-xl font-bold tracking-tight text-yellow-600">{formatCurrency(kpis.totalProjetado)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="py-3 px-4 pb-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <Wallet className="h-3.5 w-3.5" /> Salários Fixos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="text-xl font-bold tracking-tight">{formatCurrency(kpis.totalFixo)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receivables">
        <TabsList className="h-9 mb-5">
          <TabsTrigger value="receivables" className="text-xs gap-1.5">
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Contas a Receber
          </TabsTrigger>
          <TabsTrigger value="payables" className="text-xs gap-1.5">
            <ArrowUpFromLine className="h-3.5 w-3.5" />
            Contas a Pagar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="mt-0">
          <ReceivablesTab
            deals={filteredDeals}
            selectedMonth={selectedMonth}
            getUserName={getUserName}
            onConfirmMensalidade={handleConfirmMensalidade}
            onConfirmImplantacao={handleConfirmImplantacao}
            onConfirmInstallment={handleConfirmInstallment}
          />
        </TabsContent>

        <TabsContent value="payables" className="mt-0">
          <PayablesTab
            deals={filteredDeals}
            salaries={filteredSalaries}
            profiles={profiles}
            getUserName={getUserName}
            presentations={presentations}
            globalParams={globalParams}
            onToggleCommissionPayment={handleToggleCommissionPayment}
            onToggleSalaryPayment={handleToggleSalaryPayment}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Contas a Receber ── */

interface ReceivablesTabProps {
  deals: DealRow[];
  selectedMonth: string;
  getUserName: (id: string) => string;
  onConfirmMensalidade: (id: string) => void;
  onConfirmImplantacao: (id: string) => void;
  onConfirmInstallment: (id: string, index: number, checked: boolean) => void;
}

function ReceivablesTab({ deals, selectedMonth, getUserName, onConfirmMensalidade, onConfirmImplantacao, onConfirmInstallment }: ReceivablesTabProps) {
  if (deals.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          Nenhum recebimento previsto para este mês.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {deals.map((deal) => (
        <Card key={deal.id} className="overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {deal.client_name}
                <Badge variant="outline" className="ml-2 text-[10px]">{deal.operation}</Badge>
              </CardTitle>
              <span className="text-xs text-muted-foreground">SDR: {getUserName(deal.user_id)}</span>
            </div>
          </CardHeader>
          <CardContent className="py-3 px-4 space-y-3">
            {/* Mensalidade */}
            {deal.monthly_value > 0 && deal.first_payment_date && getMonthKey(deal.first_payment_date) === selectedMonth && (
              <div className="flex items-center justify-between p-2 rounded-md border border-border/60 bg-background">
                <div>
                  <p className="text-xs font-medium">Mensalidade</p>
                  <p className="text-sm font-bold">{formatCurrency(deal.monthly_value)}</p>
                  <p className="text-[10px] text-muted-foreground">Venc.: {new Date(deal.first_payment_date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
                {deal.is_mensalidade_paid_by_client ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                    <Check className="h-3 w-3 mr-1" /> Recebido
                  </Badge>
                ) : (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onConfirmMensalidade(deal.id)}>
                    Confirmar Recebimento
                  </Button>
                )}
              </div>
            )}

            {/* Implantação */}
            {deal.implantation_value > 0 && !deal.is_installment && deal.implantation_payment_date && getMonthKey(deal.implantation_payment_date) === selectedMonth && (
              <div className="flex items-center justify-between p-2 rounded-md border border-border/60 bg-background">
                <div>
                  <p className="text-xs font-medium">Implantação</p>
                  <p className="text-sm font-bold">{formatCurrency(deal.implantation_value)}</p>
                  <p className="text-[10px] text-muted-foreground">Venc.: {new Date(deal.implantation_payment_date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
                {deal.is_implantacao_paid_by_client ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                    <Check className="h-3 w-3 mr-1" /> Recebido
                  </Badge>
                ) : (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onConfirmImplantacao(deal.id)}>
                    Confirmar Recebimento
                  </Button>
                )}
              </div>
            )}

            {/* Parcelas */}
            {deal.is_installment && deal.implantation_value > 0 && Array.isArray(deal.installment_dates) && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Parcelas de Implantação ({deal.installment_count}x)</p>
                {deal.installment_dates.map((inst: any, idx: number) => {
                  const dateStr = inst?.date || inst;
                  if (!dateStr || getMonthKey(dateStr) !== selectedMonth) return null;
                  const isPaid = inst?.paid === true;
                  const parcelValue = deal.implantation_value / deal.installment_count;
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-md border border-border/60 bg-background">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isPaid}
                          onCheckedChange={(checked) => onConfirmInstallment(deal.id, idx, !!checked)}
                        />
                        <div>
                          <p className="text-xs font-medium">Parcela {idx + 1}/{deal.installment_count}</p>
                          <p className="text-sm font-bold">{formatCurrency(parcelValue)}</p>
                          <p className="text-[10px] text-muted-foreground">Venc.: {new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                        </div>
                      </div>
                      {isPaid && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          <Check className="h-3 w-3 mr-1" /> Pago
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Contas a Pagar ── */

interface PayablesTabProps {
  deals: DealRow[];
  salaries: SalaryRow[];
  profiles: ProfileMap;
  getUserName: (id: string) => string;
  presentations: any;
  globalParams: any;
  onToggleCommissionPayment: (dealId: string, currentStatus: boolean, specificDate?: string) => void;
  onToggleSalaryPayment: (salaryId: string, currentStatus: boolean) => void;
}

function ExpandableCommissionRow({ deal, profile, getUserName, presentations, globalParams, onToggleCommissionPayment }: any) {
  const [expanded, setExpanded] = useState(false);
  const [payDate, setPayDate] = useState(deal.user_payment_date ? deal.user_payment_date.slice(0, 10) : new Date().toISOString().slice(0, 10));

  const baseDate = deal.first_payment_date || deal.implantation_payment_date || deal.closing_date;
  const { monthKey, expectedPaymentDate } = getPaymentDateInfo(baseDate);

  const bpMeta = globalParams?.meta_apresentacoes_bluepex || 15;
  const bpSuperMeta = globalParams?.super_meta_bluepex || 30;
  const opMeta = globalParams?.meta_apresentacoes_opus || 15;
  const opSuperMeta = globalParams?.super_meta_opus || 30;

  const presMonth = presentations[monthKey] || { bluepex: 0, opus: 0 };
  const presCount = deal.operation === "BluePex" ? presMonth.bluepex : presMonth.opus;
  const meta = deal.operation === "BluePex" ? bpMeta : opMeta;
  const smeta = deal.operation === "BluePex" ? bpSuperMeta : opSuperMeta;

  const tier = getCommissionTier(presCount, meta, smeta);
  const commissionRate = (profile?.commission_percent || 20) / 100;

  const baseMonthlyComm = Math.round((deal.monthly_value * Math.min(tier.rate, 1.0)) * commissionRate * 100) / 100;
  const baseImplComm = Math.round((deal.implantation_value * 0.4) * commissionRate * 100) / 100;
  const superMetaBonus = tier.rate >= 2.0 ? baseMonthlyComm : 0;
  const dealComiss = baseMonthlyComm + baseImplComm + superMetaBonus;

  return (
    <>
      <TableRow onClick={() => setExpanded(!expanded)} className="cursor-pointer hover:bg-muted/50 transition-colors">
        <TableCell className="w-[30px] p-2">
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </TableCell>
        <TableCell className="text-sm font-medium">{getUserName(deal.user_id)}</TableCell>
        <TableCell className="text-sm">{deal.client_name}</TableCell>
        <TableCell>
          <Badge variant="outline" className="text-[10px]">{deal.operation}</Badge>
        </TableCell>
        <TableCell className="text-right text-sm font-mono font-semibold text-primary">
          {formatCurrency(dealComiss)}
        </TableCell>
        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant={deal.is_paid_to_user ? "outline" : "default"} className={`h-7 text-xs ${deal.is_paid_to_user ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {deal.is_paid_to_user ? "Pago" : "Dar Baixa"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 shadow-lg" align="end">
              <div className="space-y-3">
                <p className="text-sm font-medium">Confirmar Pagamento</p>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Data da Baixa Realizada</label>
                  <Input type="date" className="h-8 text-xs" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
                <Button size="sm" className={`w-full h-8 text-xs text-white ${deal.is_paid_to_user ? 'bg-destructive hover:bg-destructive/90' : 'bg-emerald-600 hover:bg-emerald-700'}`} onClick={() => onToggleCommissionPayment(deal.id, deal.is_paid_to_user || false, payDate)}>
                  {deal.is_paid_to_user ? "Remover Baixa" : "Confirmar Recebido"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </TableCell>
      </TableRow>
      
      {expanded && (
        <TableRow className="bg-muted/10">
          <TableCell colSpan={6} className="p-0">
            <div className="p-4 grid grid-cols-2 lg:grid-cols-6 gap-4 border-b border-border/50 text-xs">
              <div className="space-y-1">
                <p className="text-muted-foreground">Valor Mensalidade</p>
                <p className="font-mono font-medium">{formatCurrency(deal.monthly_value)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Valor Implantação</p>
                <p className="font-mono font-medium">{formatCurrency(deal.implantation_value)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Comissão Base</p>
                <p className="font-mono font-medium">{formatCurrency(baseMonthlyComm + baseImplComm)} <span className="text-[9px] text-muted-foreground">({tier.label})</span></p>
              </div>
              <div className="space-y-1">
                <p className="text-emerald-600/80">Super Meta Adicional</p>
                <p className="font-mono font-medium text-emerald-600">{superMetaBonus > 0 ? "+" + formatCurrency(superMetaBonus) : "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Pagamento Previsto</p>
                <p className="font-medium text-blue-600/80">{new Date(expectedPaymentDate + "T12:00:00").toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Data Realizada</p>
                <p className="font-medium text-emerald-600/80">{deal.user_payment_date ? new Date(deal.user_payment_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</p>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function PayablesTab({ deals, salaries, profiles, getUserName, presentations, globalParams, onToggleCommissionPayment, onToggleSalaryPayment }: PayablesTabProps) {
  return (
    <div className="space-y-5">
      {/* Commissions */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Comissões a Pagar
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[30px]"></TableHead>
                <TableHead className="text-[11px]">SDR</TableHead>
                <TableHead className="text-[11px]">Cliente</TableHead>
                <TableHead className="text-[11px]">Operação</TableHead>
                <TableHead className="text-[11px] text-right">Comissão Total</TableHead>
                <TableHead className="text-[11px] text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    Nenhuma comissão contabilizada para este mês.
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((deal) => (
                  <ExpandableCommissionRow 
                    key={deal.id}
                    deal={deal}
                    profile={profiles[deal.user_id]}
                    getUserName={getUserName}
                    presentations={presentations}
                    globalParams={globalParams}
                    onToggleCommissionPayment={onToggleCommissionPayment}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Salaries */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Salários Fixos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-[11px]">Funcionário</TableHead>
                <TableHead className="text-[11px] text-right">Valor</TableHead>
                <TableHead className="text-[11px]">Vencimento</TableHead>
                <TableHead className="text-[11px] text-center">Transferido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                    Nenhum salário registrado para este mês.
                  </TableCell>
                </TableRow>
              ) : (
                salaries.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{getUserName(s.user_id)}</TableCell>
                    <TableCell className="text-right text-sm font-mono">{formatCurrency(s.amount)}</TableCell>
                    <TableCell className="text-sm">{new Date(s.expected_payment_date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={s.is_paid_by_gestor || false}
                        onCheckedChange={() => onToggleSalaryPayment(s.id, s.is_paid_by_gestor || false)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
