import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Deal, PaymentStatus, AppSettings } from "@/lib/types";
import { calculateCommission, formatCurrency } from "@/lib/commission";
import { Pencil, Trash2, TableIcon } from "lucide-react";
import { format } from "date-fns";

interface DealsTableProps {
  deals: Deal[];
  presentations: number;
  settings: AppSettings;
  superMetaActive: boolean;
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (deal: Deal, status: PaymentStatus) => void;
}

const statusVariant: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  Pendente: "secondary",
  Pago: "default",
  Cancelado: "destructive",
};

export function DealsTable({ deals, presentations, settings, superMetaActive, onEdit, onDelete, onStatusChange }: DealsTableProps) {
  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="section-title flex items-center gap-2">
          <TableIcon className="h-4 w-4 text-primary" />
          Fechamentos do Mês
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {deals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum fechamento neste mês.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead className="text-right">Mensalidade</TableHead>
                  <TableHead className="text-right">Implantação</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead>Pgto. Implantação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => {
                  const comm = calculateCommission(deal, presentations, settings, superMetaActive);
                  return (
                    <TableRow key={deal.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(deal.closingDate), "dd/MM/yy")}
                      </TableCell>
                      <TableCell className="font-medium">{deal.clientName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {deal.operation}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(deal.monthlyValue)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(deal.implantationValue)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-primary">
                        {formatCurrency(comm.totalCommission)}
                        {comm.superMetaBonus > 0 && (
                          <span className="block text-xs text-yellow-500">+{formatCurrency(comm.superMetaBonus)} super</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {deal.isInstallment && deal.installmentDates.length > 0 ? (
                          <div className="space-y-0.5">
                            {deal.installmentDates.map((d, i) => (
                              <div key={i} className="text-muted-foreground">
                                {i + 1}ª: {d.date ? format(new Date(d.date), "dd/MM/yy") : "—"}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="font-mono">
                            {deal.implantationPaymentDate
                              ? format(new Date(deal.implantationPaymentDate), "dd/MM/yy")
                              : "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={deal.paymentStatus}
                          onValueChange={(v) => onStatusChange(deal, v as PaymentStatus)}
                        >
                          <SelectTrigger className="h-7 w-[110px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                            <SelectItem value="Pago">Pago</SelectItem>
                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(deal)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(deal.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
