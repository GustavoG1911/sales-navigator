import { FormEvent, useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Prospect } from "@/lib/types";
import {
  combineFollowUpDateTime,
  getFollowUpParts,
} from "@/lib/prospect-follow-up";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ProspectFollowUpDialogProps {
  open: boolean;
  prospect: Prospect | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (followUpAt: string, note: string) => void;
}
export function ProspectFollowUpDialog({
  open,
  prospect,
  isSaving,
  onOpenChange,
  onSave,
}: ProspectFollowUpDialogProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const parts = getFollowUpParts(prospect?.follow_up_at);
    setDate(parts.date);
    setTime(parts.time);
    setNote(prospect?.follow_up_note || "");
    setError("");
  }, [open, prospect]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const followUpAt = combineFollowUpDateTime(date, time);
    if (!followUpAt) {
      setError("Informe uma data e um horário válidos.");
      return;
    }
    if (new Date(followUpAt).getTime() <= Date.now()) {
      setError("O retorno precisa ser agendado para um horário futuro.");
      return;
    }

    setError("");
    onSave(followUpAt, note.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Agendar retorno
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="text-sm font-semibold">{prospect?.company || "Prospect"}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="follow-up-date">Data</Label>
              <Input
                id="follow-up-date"
                type="date"
                value={date}
                min={getFollowUpParts().date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="follow-up-time">Horário</Label>
              <Input
                id="follow-up-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="follow-up-note">Observação opcional</Label>
            <Textarea
              id="follow-up-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex.: cliente pediu retorno após reunião interna"
              rows={3}
              className="resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : prospect?.follow_up_at ? "Reagendar" : "Agendar retorno"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
