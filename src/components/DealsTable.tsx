import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Deal, PaymentStatus, AppSettings } from "@/lib/types";
import { calculateCommission, formatCurrency } from "@/lib/commission";
import { Pencil, Trash2 } from "lucide-react";
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

export function DealsTable({ deals, presentations, settings, superMetaActive, onEdit, onDelete, onStatusChange }: DealsTableProps) {
  return (
    <Card className="glass-card">
      <CardContent className="p-0">
        <div className="px-4 pt-4 pb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Fechamentos do Período
          </span>
        </div>
        {deals.length === 0 ? (
          <div className="px-4 pb-6 pt-4 text-center text-sm text-muted-foreground">
            Nenhum fechamento encontrado.
          </div>
        ) : (
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="px-3 py-2.5 text-xs w-[72px]">Data</TableHead>
                <TableHead className="px-3 py-2.5 text-xs">Cliente</TableHead>
                <TableHead className="px-3 py-2.5 text-xs w-[90px]">Operação</TableHead>
                <TableHead className="px-3 py-2.5 text-xs text-right w-[100px]">Mensalidade</TableHead>
                <TableHead className="px-3 py-2.5 text-xs text-right w-[100px]">Implantação</TableHead>
                <TableHead className="px-3 py-2.5 text-xs text-right w-[110px]">Comissão</TableHead>
                <TableHead className="px-3 py-2.5 text-xs text-right w-[110px]">Status</TableHead>
                <TableHead className="px-2 py-2.5 w-[64px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => {
                const comm = calculateCommission(deal, presentations, settings, superMetaActive);
                return (
                  <TableRow key={deal.id} className="border-border/30 hover:bg-muted/30">
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
                    <TableCell className="px-3 py-2.5 text-right">
                      <Select
                        value={deal.paymentStatus}
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
                    <TableCell className="px-2 py-2.5">
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
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
