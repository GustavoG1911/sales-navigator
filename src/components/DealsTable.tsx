import React, { useState, Fragment } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Deal, PaymentStatus, AppSettings, MonthlyPresentations } from "@/lib/types";
import { calculateCommission, formatCurrency, getPresentationsForDeal } from "@/lib/commission";
import { Pencil, Trash2, ChevronDown, ChevronRight, PackageOpen } from "lucide-react";
import { format } from "date-fns";

interface DealsTableProps {
  deals: Deal[];
  presentations: MonthlyPresentations;
  settings: AppSettings;
  superMetaActive: boolean;
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (deal: Deal, status: PaymentStatus) => void;
}

function CommissionDetail({ deal, comm }: { deal: Deal; comm: ReturnType<typeof calculateCommission> }) {
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
          <span className="font-medium text-warning">⚡ Bônus Super Meta:</span>{" "}
          <span className="font-bold text-warning">{formatCurrency(comm.superMetaBonus)}</span>
        </div>
      )}
      <div className="pt-1 border-t border-border/30">
        <span className="font-medium text-foreground">Total:</span>{" "}
        <span className="font-bold text-primary text-sm">{formatCurrency(comm.totalCommission)}</span>
      </div>
    </div>
  );
}

export function DealsTable({ deals, presentations, settings, superMetaActive, onEdit, onDelete, onStatusChange }: DealsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { position } = useAuth();
  const isDirector = position === "Diretor";

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-0">
        <div className="px-4 pt-4 pb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Fechamentos do Período
          </span>
        </div>
        {deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 gap-3">
            <PackageOpen className="h-10 w-10 text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Nenhum fechamento no período</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Ajuste o filtro de período ou registre um novo fechamento.</p>
            </div>
          </div>
        ) : (
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="px-2 py-2.5 text-xs w-[32px]"></TableHead>
                <TableHead className="px-3 py-2.5 text-xs w-[72px]">Data</TableHead>
                <TableHead className="px-3 py-2.5 text-xs">Cliente</TableHead>
                <TableHead className="px-3 py-2.5 text-xs w-[90px]">Operação</TableHead>
                <TableHead className="px-3 py-2.5 text-xs text-right w-[100px]">Mensalidade</TableHead>
                <TableHead className="px-3 py-2.5 text-xs text-right w-[100px]">Implantação</TableHead>
                <TableHead className="px-3 py-2.5 text-xs text-right w-[110px]">Comissão</TableHead>
                {isDirector ? (
                  <>
                    <TableHead className="px-3 py-2.5 text-xs text-right w-[110px]">Status Cliente</TableHead>
                    <TableHead className="px-3 py-2.5 text-xs text-right w-[110px]">Status Comissão</TableHead>
                  </>
                ) : (
                  <TableHead className="px-3 py-2.5 text-xs text-right w-[110px]">Situação</TableHead>
                )}
                <TableHead className="px-2 py-2.5 w-[64px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => {
                const presCount = getPresentationsForDeal(deal, presentations);
                const comm = calculateCommission(deal, presCount, settings, superMetaActive);
                const isExpanded = expandedId === deal.id;
                return (
                  <Fragment key={deal.id}>
                    <TableRow
                      className="border-border/30 hover:bg-muted/30 cursor-pointer"
                      onClick={() => toggleExpand(deal.id)}
                    >
                      <TableCell className="px-2 py-2.5">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm tabular-nums text-muted-foreground">
                        {format(new Date(deal.closingDate), "dd/MM/yy")}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm font-medium truncate max-w-[180px]">{deal.clientName}</TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Badge variant={deal.operation === "BluePex" ? "default" : "secondary"} className="text-[10px] font-medium px-1.5 py-0">
                          {deal.operation}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-right font-bold tracking-tight">
                        {formatCurrency(deal.monthlyValue)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-right font-bold tracking-tight">
                        {formatCurrency(deal.implantationValue)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-right font-bold tracking-tight text-primary">
                        {formatCurrency(comm.totalCommission)}
                        {comm.superMetaBonus > 0 && (
                          <span className="block text-[10px] text-warning font-medium">+{formatCurrency(comm.superMetaBonus)} super</span>
                        )}
                      </TableCell>
                      {isDirector ? (
                        <>
                          <TableCell className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={deal.paymentStatus || "Pendente"}
                              onValueChange={(v) => onStatusChange(deal, v as PaymentStatus)}
                            >
                              <SelectTrigger className="h-7 w-[100px] text-xs ml-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pendente">Pendente</SelectItem>
                                <SelectItem value="Pago">Pago</SelectItem>
                                <SelectItem value="Cancelado">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-right">
                            {deal.isUserConfirmedPayment ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Recebido</Badge>
                            ) : deal.isPaidToUser ? (
                              <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-500/30 bg-orange-500/10">Aguardando SDR</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-500/30 bg-yellow-500/10">A Pagar</Badge>
                            )}
                          </TableCell>
                        </>
                      ) : (
                        <TableCell className="px-3 py-2.5 text-right">
                          {deal.isUserConfirmedPayment ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Recebida</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-500/30 bg-yellow-500/10">Pendente</Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(deal)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(deal.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${deal.id}-detail`} className="hover:bg-transparent">
                        <TableCell colSpan={9} className="p-0">
                          <CommissionDetail deal={deal} comm={comm} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
