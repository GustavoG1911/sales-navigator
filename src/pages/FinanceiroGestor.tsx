import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
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
import { formatCurrency, getMonthKey, formatMonthLabel } from "@/lib/commission";

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

export default function FinanceiroGestor() {
  const { role, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "gestor" && role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <FinanceiroContent />;
}

function FinanceiroContent() {
  const currentMonthKey = getMonthKey(new Date());
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const monthOptions = useMemo(() => buildMonthOptions(), []);

  const [deals, setDeals] = useState<DealRow[]>([]);
  const [salaries, setSalaries] = useState<SalaryRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dealsRes, salariesRes, profilesRes] = await Promise.all([
        supabase.from("deals").select("*").order("closing_date", { ascending: false }),
        supabase.from("salary_payments").select("*"),
        supabase.from("profiles").select("user_id, full_name, display_name, commission_percent"),
      ]);

      if (dealsRes.data) setDeals(dealsRes.data as any[]);
      if (salariesRes.data) setSalaries(salariesRes.data as any[]);
      if (profilesRes.data) {
        const map: ProfileMap = {};
        (profilesRes.data as any[]).forEach((p) => {
          map[p.user_id] = {
            full_name: p.full_name || p.display_name || "—",
            display_name: p.display_name || "",
            commission_percent: p.commission_percent || 20,
          };
        });
        setProfiles(map);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter deals relevant to selected month
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      // Check if first_payment_date or implantation_payment_date falls in selected month
      const fpKey = d.first_payment_date ? getMonthKey(d.first_payment_date) : null;
      const ipKey = d.implantation_payment_date ? getMonthKey(d.implantation_payment_date) : null;
      // Also check installment dates
      let hasInstallmentInMonth = false;
      if (d.is_installment && Array.isArray(d.installment_dates)) {
        hasInstallmentInMonth = d.installment_dates.some((inst: any) => {
          const dateStr = inst?.date || inst;
          return dateStr && getMonthKey(dateStr) === selectedMonth;
        });
      }
      return fpKey === selectedMonth || ipKey === selectedMonth || hasInstallmentInMonth;
    });
  }, [deals, selectedMonth]);

  const filteredSalaries = useMemo(() => {
    return salaries.filter((s) => getMonthKey(s.reference_month) === selectedMonth);
  }, [salaries, selectedMonth]);

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
    loadData();
  };

  const handleConfirmImplantacao = async (dealId: string) => {
    const { error } = await supabase
      .from("deals")
      .update({ is_implantacao_paid_by_client: true } as any)
      .eq("id", dealId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Recebimento de implantação confirmado!");
    loadData();
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
    loadData();
  };

  const handleMarkPaidToUser = async (dealId: string, checked: boolean) => {
    const { error } = await supabase
      .from("deals")
      .update({ is_paid_to_user: checked } as any)
      .eq("id", dealId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(checked ? "Transferência marcada!" : "Transferência desmarcada");
    loadData();
  };

  const handleMarkSalaryPaid = async (salaryId: string, checked: boolean) => {
    const { error } = await supabase
      .from("salary_payments")
      .update({ is_paid_by_gestor: checked, payment_date: checked ? new Date().toISOString() : null } as any)
      .eq("id", salaryId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(checked ? "Salário marcado como pago!" : "Salário desmarcado");
    loadData();
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
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold">Financeiro</h2>
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
            deals={payableDeals}
            salaries={filteredSalaries}
            profiles={profiles}
            getUserName={getUserName}
            onMarkPaidToUser={handleMarkPaidToUser}
            onMarkSalaryPaid={handleMarkSalaryPaid}
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
  onMarkPaidToUser: (dealId: string, checked: boolean) => void;
  onMarkSalaryPaid: (salaryId: string, checked: boolean) => void;
}

function PayablesTab({ deals, salaries, profiles, getUserName, onMarkPaidToUser, onMarkSalaryPaid }: PayablesTabProps) {
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
                <TableHead className="text-[11px]">SDR</TableHead>
                <TableHead className="text-[11px]">Cliente</TableHead>
                <TableHead className="text-[11px]">Operação</TableHead>
                <TableHead className="text-[11px] text-right">Valor Mensal</TableHead>
                <TableHead className="text-[11px] text-right">Implantação</TableHead>
                <TableHead className="text-[11px] text-center">Transferido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    Nenhuma comissão destravada para este mês.
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((deal) => {
                  const commPercent = (profiles[deal.user_id]?.commission_percent || 20) / 100;
                  const mensalComm = deal.is_mensalidade_paid_by_client ? deal.monthly_value * commPercent : 0;
                  const implComm = deal.is_implantacao_paid_by_client ? deal.implantation_value * 0.4 * commPercent : 0;

                  return (
                    <TableRow key={deal.id}>
                      <TableCell className="text-sm">{getUserName(deal.user_id)}</TableCell>
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
                        <Checkbox
                          checked={deal.is_paid_to_user || false}
                          onCheckedChange={(checked) => onMarkPaidToUser(deal.id, !!checked)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
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
                        onCheckedChange={(checked) => onMarkSalaryPaid(s.id, !!checked)}
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
