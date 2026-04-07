import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Save, User } from "lucide-react";

interface ProfileData {
  full_name: string;
  job_title: string;
  fixed_salary: number;
  commission_percent: number;
}

interface OnboardingModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function OnboardingModal({ forceOpen, onClose }: OnboardingModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isForced, setIsForced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileData>({
    full_name: "",
    job_title: "",
    fixed_salary: 0,
    commission_percent: 20,
  });

  useEffect(() => {
    if (!user) return;
    checkProfile();
  }, [user]);

  useEffect(() => {
    if (forceOpen) {
      loadProfile();
      setOpen(true);
      setIsForced(false);
    }
  }, [forceOpen]);

  const checkProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, job_title, fixed_salary, commission_percent")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setForm({
        full_name: data.full_name || "",
        job_title: data.job_title || "",
        fixed_salary: data.fixed_salary || 0,
        commission_percent: data.commission_percent || 20,
      });
      if (!data.full_name || !data.job_title) {
        setIsForced(true);
        setOpen(true);
      }
    } else {
      setIsForced(true);
      setOpen(true);
    }
  };

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, job_title, fixed_salary, commission_percent")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setForm({
        full_name: data.full_name || "",
        job_title: data.job_title || "",
        fixed_salary: data.fixed_salary || 0,
        commission_percent: data.commission_percent || 20,
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.full_name.trim() || !form.job_title.trim()) {
      toast.error("Nome e Cargo são obrigatórios.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        job_title: form.job_title.trim(),
        fixed_salary: form.fixed_salary,
        commission_percent: form.commission_percent,
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar perfil: " + error.message);
      return;
    }
    toast.success("Perfil atualizado com sucesso!");
    setIsForced(false);
    setOpen(false);
    onClose?.();
  };

  const handleOpenChange = (value: boolean) => {
    if (isForced && !value) return;
    setOpen(value);
    if (!value) onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => { if (isForced) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (isForced) e.preventDefault(); }}
        // Hide close button when forced
        {...(isForced ? { "data-forced": true } : {})}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {isForced ? "Complete seu Perfil" : "Meu Perfil"}
          </DialogTitle>
          <DialogDescription>
            {isForced
              ? "Preencha seus dados para continuar usando o sistema."
              : "Atualize suas informações pessoais."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome Completo *</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Seu nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cargo *</Label>
            <Input
              value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              placeholder="Ex: SDR, Closer, Gerente"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Salário Fixo (R$)</Label>
              <Input
                type="number"
                min="0"
                value={form.fixed_salary}
                onChange={(e) => setForm({ ...form, fixed_salary: Number(e.target.value) })}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Comissão (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.commission_percent}
                onChange={(e) => setForm({ ...form, commission_percent: Number(e.target.value) })}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Perfil"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
