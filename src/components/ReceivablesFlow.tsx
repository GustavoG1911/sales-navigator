import { useMemo, useState } from "react";
import { Deal, AppSettings, MonthlyPresentations, MonthlySuperMeta, ReceivableAdjustments, ReceivableAdjustment, PaymentStatus } from "@/lib/types";
import { calculateCommission, formatCurrency, getMonthKey, getPayableMonthKey, getPresentationsForDeal } from "@/lib/commission";
import { DateRange } from "@/components/PeriodFilter";
import { KpiCard } from "@/components/KpiCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowDownToLine, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";

interface ReceivableEntry {
  id: string;
  type: "salary" | "monthly_commission" | "implantation_commission" | "super_meta_bonus";
  label: string;
  clientName?: string;
  dealId?: string;
  deal?: Deal;
  dueDate: string;
  baseValue: number;
  status: PaymentStatus;
  commBreakdown?: ReturnType<typeof calculateCommission>;
}

interface Props {
  allDeals: Deal[];
  settings: AppSettings;
  presentations: MonthlyPresentations;
  superMeta: MonthlySuperMeta;
  dateRange: DateRange;
  adjustments: ReceivableAdjustments;
  onUpdateAdjustment: (entry: ReceivableAdjustment) => void;
  onStatusChange: (deal: Deal, status: PaymentStatus) => void;
}

function CommissionDetailRow({ entry }: { entry: ReceivableEntry }) {
  if (!entry.deal || !entry.commBreakdown) return null;
  const comm = entry.commBreakdown;
  const deal = entry.deal;
  const basePercent = comm.monthlyBaseRate === 1 ? "100%" : "70%";
  const ratePercent = (comm.commissionRate * 100).toFixed(0) + "%";

  return (
    <div className="px-4 py-3 bg-muted/20 border-t border-border/20 text-xs text-muted-foreground space-y-1.5">
      <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-2">Detalhamento do Cálculo</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="p-2 rounded bg-muted/30">
          <span className="font-medium text-foreground">Mensalidade:</span>{" "}
          {formatCurrency(deal.monthlyValue)} × {basePercent} × {ratePercent} = <span className="font-bold text-primary">{formatCurrency(comm.monthlyCommission)}</span>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <span className="font-medium text-foreground">Implantação:</span>{" "}
          {formatCurrency(deal.implantationValue)} × 40% × {ratePercent} = <span className="font-bold text-primary">{formatCurrency(comm.implantationCommission)}</span>
        </div>
      </div>
      {comm.superMetaBonus > 0 && (
        <div className="p-2 rounded bg-warning/10 border border-warning/20">
          <span className="font-medium text-warning">⚡ Super Meta:</span>{" "}
          <span className="font-bold text-warning">{formatCurrency(comm.superMetaBonus)}</span>
        </div>
      )}
      <div className="pt-1 border-t border-border/30">
        <span className="font-medium text-foreground">Total Comissão:</span>{" "}
        <span className="font-bold text-primary text-sm">{formatCurrency(comm.totalCommission)}</span>
      </div>
    </div>
  );
}

export function ReceivablesFlow({
  allDeals,
  settings,
  presentations,
  superMeta,
  dateRange,
  adjustments,
  onUpdateAdjustment,
  onStatusChange,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const entries = useMemo(() => {
    const result: ReceivableEntry[] = [];

    // Add salary entries for each month in range
    const startMonth = dateRange.from.getFullYear() * 12 + dateRange.from.getMonth();
    const endMonth = dateRange.to.getFullYear() * 12 + dateRange.to.getMonth();
    for (let m = startMonth; m <= endMonth; m++) {
      const year = Math.floor(m / 12);
      const month = m % 12;
      const salaryDate = new Date(year, month, 1);
      result.push({
        id: `salary-${year}-${String(month + 1).padStart(2, "0")}`,
        type: "salary",
        label: "Salário Fixo",
        dueDate: salaryDate.toISOString(),
        baseValue: settings.fixedSalary,
        status: "Pendente",
      });
    }

    // Filter deals by PAYMENT date (payable month falls within dateRange)
    const payableDeals = allDeals.filter((d) => {
      const payMonth = getPayableMonthKey(d.closingDate);
      const payDate = new Date(payMonth + "-20");
      return payDate >= dateRange.from && payDate <= dateRange.to;
    });

    payableDeals.forEach((deal) => {
      const presCount = getPresentationsForDeal(deal, presentations);
      const dealSuperMeta = superMeta[getMonthKey(deal.closingDate)] || false;
      const comm = calculateCommission(deal, presCount, settings, dealSuperMeta);
      const payMonthKey = getPayableMonthKey(deal.closingDate);
      const dueDate = new Date(payMonthKey + "-20").toISOString();

      if (comm.monthlyCommission > 0) {
        result.push({
          id: `monthly-${deal.id}`,
          type: "monthly_commission",
          label: "Comissão Mensalidade",
          clientName: deal.clientName,
          dealId: deal.id,
          deal,
          dueDate,
          baseValue: comm.monthlyCommission,
          status: deal.paymentStatus,
          commBreakdown: comm,
        });
      }

      if (comm.implantationCommission > 0) {
        result.push({
          id: `implant-${deal.id}`,
          type: "implantation_commission",
          label: "Comissão Implantação",
          clientName: deal.clientName,
          dealId: deal.id,
          deal,
          dueDate,
          baseValue: comm.implantationCommission,
          status: deal.paymentStatus,
          commBreakdown: comm,
        });
      }

      if (comm.superMetaBonus > 0) {
        result.push({
          id: `supermeta-${deal.id}`,
          type: "super_meta_bonus",
          label: "Bônus Super Meta",
          clientName: deal.clientName,
          dealId: deal.id,
          deal,
          dueDate,
          baseValue: comm.superMetaBonus,
          status: deal.paymentStatus,
          commBreakdown: comm,
        });
      }
    });

    result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return result;
  }, [allDeals, settings, presentations, superMeta, dateRange]);

  const summary = useMemo(() => {
    let toReceive = 0;
    let received = 0;
    let projected = 0;

    entries.forEach((entry) => {
      const adj = adjustments[entry.id];
      const finalValue = entry.baseValue + (adj?.adjustment || 0);
      const salaryStatus = entry.type === "salary" ? (adj?.salaryPaid ? "Pago" : "Pendente") : entry.status;
      projected += finalValue;
      if (salaryStatus === "Pago") {
        received += finalValue;
      } else {
        toReceive += finalValue;
      }
    });

    return { toReceive, received, projected };
  }, [entries, adjustments]);

  const handleAdjustmentChange = (entryId: string, field: "adjustment" | "reason" | "effectiveDate", value: string | number) => {
    const existing = adjustments[entryId] || { id: entryId, adjustment: 0, reason: "", effectiveDate: "" };
    onUpdateAdjustment({ ...existing, [field]: value });
  };

  const handleStatusToggle = (entry: ReceivableEntry, newStatus: PaymentStatus) => {
    if (entry.dealId) {
      const deal = allDeals.find((d) => d.id === entry.dealId);
      if (deal) {
        onStatusChange(deal, newStatus);
      }
    }
  };

  const getTypeBadge = (type: ReceivableEntry["type"]) => {
    const map = {
      salary: { label: "Salário", variant: "outline" as const },
      monthly_commission: { label: "Mensalidade", variant: "default" as const },
      implantation_commission: { label: "Implantação", variant: "secondary" as const },
      super_meta_bonus: { label: "Super Meta", variant: "destructive" as const },
    };
    return map[type];
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard title="A Receber (Mês)" value={formatCurrency(summary.toReceive)} icon={ArrowDownToLine} variant="primary" />
        <KpiCard title="Recebido (Mês)" value={formatCurrency(summary.received)} icon={Wallet} variant="success" />
        <KpiCard title="Saldo Futuro Projetado" value={formatCurrency(summary.projected)} icon={TrendingUp} variant="warning" />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider w-[32px]"></TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider w-[100px]">Vencimento</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Tipo</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Cliente / Descrição</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-right w-[110px]">Valor Base</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-center w-[100px]">Ajuste (+/-)</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider w-[140px]">Motivo</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-right w-[110px]">Valor Final</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-right w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8 text-sm">
                  Nenhum lançamento para o período selecionado
                </TableCell>
              </TableRow>
            )}
            {entries.map((entry) => {
              const adj = adjustments[entry.id];
              const adjustmentVal = adj?.adjustment || 0;
              const finalValue = entry.baseValue + adjustmentVal;
              const badgeInfo = getTypeBadge(entry.type);
              const hasDetail = entry.type !== "salary" && entry.commBreakdown;
              const isExpanded = expandedId === entry.id;

              return (
                <>
                  <TableRow
                    key={entry.id}
                    className={`group ${hasDetail ? "cursor-pointer" : ""}`}
                    onClick={() => hasDetail && toggleExpand(entry.id)}
                  >
                    <TableCell className="px-2 py-2">
                      {hasDetail && (
                        isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        type="date"
                        className="h-7 text-xs w-[100px] border-transparent group-hover:border-input"
                        value={
                          adj?.effectiveDate
                            ? adj.effectiveDate.slice(0, 10)
                            : entry.dueDate.slice(0, 10)
                        }
                        onChange={(e) =>
                          handleAdjustmentChange(entry.id, "effectiveDate", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Badge variant={badgeInfo.variant} className="text-[10px] font-medium">
                        {badgeInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm">
                      {entry.clientName || entry.label}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right font-bold tracking-tight text-sm">
                      {formatCurrency(entry.baseValue)}
                    </TableCell>
                    <TableCell className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        type="number"
                        className="h-7 text-xs text-center w-[90px] mx-auto border-transparent group-hover:border-input"
                        placeholder="0,00"
                        value={adjustmentVal || ""}
                        onChange={(e) =>
                          handleAdjustmentChange(entry.id, "adjustment", parseFloat(e.target.value) || 0)
                        }
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        className="h-7 text-xs border-transparent group-hover:border-input"
                        placeholder="Motivo..."
                        value={adj?.reason || ""}
                        onChange={(e) =>
                          handleAdjustmentChange(entry.id, "reason", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right font-bold tracking-tight text-sm">
                      <span className={adjustmentVal !== 0 ? (adjustmentVal > 0 ? "text-emerald-600" : "text-red-500") : ""}>
                        {formatCurrency(finalValue)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      {entry.type === "salary" ? (
                        <Select
                          value={adjustments[entry.id]?.salaryPaid ? "Pago" : "Pendente"}
                          onValueChange={(v) => {
                            const existing = adjustments[entry.id] || { id: entry.id, adjustment: 0, reason: "", effectiveDate: "" };
                            onUpdateAdjustment({ ...existing, salaryPaid: v === "Pago" });
                          }}
                        >
                          <SelectTrigger className="h-7 w-[90px] text-[11px] ml-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                            <SelectItem value="Pago">Pago</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select
                          value={entry.status}
                          onValueChange={(v) => handleStatusToggle(entry, v as PaymentStatus)}
                        >
                          <SelectTrigger className="h-7 w-[90px] text-[11px] ml-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                            <SelectItem value="Pago">Pago</SelectItem>
                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                  {isExpanded && hasDetail && (
                    <TableRow key={`${entry.id}-detail`} className="hover:bg-transparent">
                      <TableCell colSpan={9} className="p-0">
                        <CommissionDetailRow entry={entry} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
