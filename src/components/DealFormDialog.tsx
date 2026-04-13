import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Deal, Operation, PaymentStatus } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DealFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (deal: Deal) => void;
  editDeal?: Deal | null;
  currentPosition?: string;
  currentUserId?: string;
  executivos?: { id: string; name: string }[];
  sdrs?: { id: string; name: string }[];
}

function genId() {
  return crypto.randomUUID();
}

export function DealFormDialog({ open, onOpenChange, onSave, editDeal, currentPosition, currentUserId, executivos, sdrs }: DealFormDialogProps) {
  const [closingDate, setClosingDate] = useState<Date | undefined>();
  const [selectedExecutivoId, setSelectedExecutivoId] = useState("");
  const [selectedSdrId, setSelectedSdrId] = useState("");
  const [operation, setOperation] = useState<Operation>("BluePex");
  const [clientName, setClientName] = useState("");
  const [monthlyValue, setMonthlyValue] = useState("");
  const [implantationValue, setImplantationValue] = useState("");
  const [firstPaymentDate, setFirstPaymentDate] = useState<Date | undefined>();
  const [implantationPaymentDate, setImplantationPaymentDate] = useState<Date | undefined>();
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("2");
  const [installmentDates, setInstallmentDates] = useState<(Date | undefined)[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("Pendente");

  useEffect(() => {
    if (editDeal) {
      setClosingDate(new Date(editDeal.closingDate));
      setOperation(editDeal.operation);
      setClientName(editDeal.clientName);
      setMonthlyValue(editDeal.monthlyValue.toString());
      setImplantationValue(editDeal.implantationValue.toString());
      setFirstPaymentDate(new Date(editDeal.firstPaymentDate));
      setImplantationPaymentDate(editDeal.implantationPaymentDate ? new Date(editDeal.implantationPaymentDate) : undefined);
      setIsInstallment(editDeal.isInstallment);
      setInstallmentCount(editDeal.installmentCount.toString());
      setInstallmentDates(editDeal.installmentDates.map((d) => new Date(d.date)));
      setPaymentStatus(editDeal.paymentStatus);
      setSelectedSdrId(editDeal.sdrUserId || "");
      if (currentPosition === "Diretor" && editDeal.userId) setSelectedExecutivoId(editDeal.userId);
    } else {
      setClosingDate(new Date());
      setOperation("BluePex");
      setClientName("");
      setMonthlyValue("");
      setImplantationValue("");

      // Dia 1 do próximo mês: ≤ 7, então conta no próprio mês (sem transbordo pela Regra do Dia 07)
      const defaultPayDate = new Date();
      defaultPayDate.setMonth(defaultPayDate.getMonth() + 1);
      defaultPayDate.setDate(1);
      setFirstPaymentDate(defaultPayDate);
      setImplantationPaymentDate(defaultPayDate);

      setIsInstallment(false);
      setInstallmentCount("2");
      setInstallmentDates([]);
      setPaymentStatus("Pendente");

      if (currentPosition === "Diretor" && executivos?.length) {
        setSelectedExecutivoId(executivos[0].id);
      }
    }
  }, [editDeal, open, currentPosition, executivos]);

  useEffect(() => {
    const count = parseInt(installmentCount) || 2;
    setInstallmentDates((prev) => {
      const arr = [...prev];
      while (arr.length < count) arr.push(undefined);
      return arr.slice(0, count);
    });
  }, [installmentCount]);

  useEffect(() => {
    if (!editDeal && closingDate && !firstPaymentDate) {
      // Dia 1 do mês seguinte ao fechamento — ≤ 7, sem transbordo pela Regra do Dia 07
      const d = new Date(closingDate);
      d.setMonth(d.getMonth() + 1);
      d.setDate(1);
      setFirstPaymentDate(d);
      setImplantationPaymentDate(d);
    }
  }, [closingDate, editDeal, firstPaymentDate]);

  const handleSave = () => {
    if (currentPosition === "SDR") {
      toast.error("SDR não pode registrar fechamentos.");
      return;
    }
    if (!closingDate || !clientName.trim()) {
      toast.error("Preencha a data de fechamento e o nome da empresa.");
      return;
    }
    if (!firstPaymentDate || !implantationPaymentDate) {
      toast.error("O preenchimento da Data do Primeiro Pagamento e Data de Implantação é OBRIGATÓRIO.");
      return;
    }

    let dealUserId: string | undefined;
    if (currentPosition === "Diretor") {
      dealUserId = selectedExecutivoId || undefined;
    } else {
      dealUserId = editDeal?.userId || currentUserId;
    }

    const deal: Deal = {
      id: editDeal?.id || genId(),
      closingDate: closingDate.toISOString(),
      operation,
      clientName: clientName.trim(),
      monthlyValue: parseFloat(monthlyValue) || 0,
      implantationValue: parseFloat(implantationValue) || 0,
      firstPaymentDate: firstPaymentDate.toISOString(),
      implantationPaymentDate: implantationPaymentDate.toISOString(),
      isInstallment,
      installmentCount: isInstallment ? parseInt(installmentCount) || 2 : 0,
      installmentDates: isInstallment
        ? installmentDates.map((d) => ({ date: d?.toISOString() || "" }))
        : [],
      paymentStatus,
      userId: dealUserId,
      sdrUserId: selectedSdrId || undefined,
    };
    onSave(deal);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editDeal ? "Editar Fechamento" : "Novo Fechamento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Closing Date */}
          <div className="space-y-1.5">
            <Label>Data do Fechamento</Label>
            <DatePicker date={closingDate} onSelect={setClosingDate} />
          </div>

          {/* Operation */}
          <div className="space-y-1.5">
            <Label>Operação</Label>
            <Select value={operation} onValueChange={(v) => setOperation(v as Operation)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BluePex">BluePex</SelectItem>
                <SelectItem value="Opus Tech">Opus Tech</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Executivo picker — apenas para Diretor em novo fechamento */}
          {currentPosition === "Diretor" && !editDeal && executivos && executivos.length > 0 && (
            <div className="space-y-1.5">
              <Label>Executivo Responsável</Label>
              <Select value={selectedExecutivoId} onValueChange={setSelectedExecutivoId}>
                <SelectTrigger><SelectValue placeholder="Selecione o executivo" /></SelectTrigger>
                <SelectContent>
                  {executivos.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* SDR picker — para Executivo e Diretor */}
          {currentPosition !== "SDR" && sdrs && sdrs.length > 0 && (
            <div className="space-y-1.5">
              <Label>SDR Responsável</Label>
              <Select value={selectedSdrId} onValueChange={setSelectedSdrId}>
                <SelectTrigger><SelectValue placeholder="Selecione o SDR" /></SelectTrigger>
                <SelectContent>
                  {sdrs.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Client */}
          <div className="space-y-1.5">
            <Label>Empresa Cliente</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome da empresa" />
          </div>

          {/* Values */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor Mensalidade (R$)</Label>
              <Input type="number" min="0" step="0.01" value={monthlyValue} onChange={(e) => setMonthlyValue(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label>Valor Implantação (R$)</Label>
              <Input type="number" min="0" step="0.01" value={implantationValue} onChange={(e) => setImplantationValue(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          {/* First Payment Date */}
          <div className="space-y-1.5">
            <Label>Data Pgto. 1ª Mensalidade</Label>
            <DatePicker date={firstPaymentDate} onSelect={setFirstPaymentDate} />
          </div>

          {/* Implantation Payment Date */}
          <div className="space-y-1.5">
            <Label>Data Pgto. Implantação</Label>
            <DatePicker date={implantationPaymentDate} onSelect={setImplantationPaymentDate} />
          </div>

          {/* Installment */}
          <div className="flex items-center gap-3">
            <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
            <Label>Implantação Parcelada?</Label>
          </div>

          {isInstallment && (
            <div className="space-y-3 pl-4 border-l-2 border-primary/20">
              <div className="space-y-1.5">
                <Label>Número de Parcelas</Label>
                <Input type="number" min="2" max="24" value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} />
              </div>
              {installmentDates.map((d, i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Parcela {i + 1}</Label>
                  <DatePicker date={d} onSelect={(date) => {
                    const updated = [...installmentDates];
                    updated[i] = date;
                    setInstallmentDates(updated);
                  }} />
                </div>
              ))}
            </div>
          )}

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status do Pagamento</Label>
            <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} className="w-full">
            {editDeal ? "Salvar Alterações" : "Registrar Fechamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DatePicker({ date, onSelect }: { date?: Date; onSelect: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy") : "Selecionar data"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}
