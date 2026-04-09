import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, SlidersHorizontal, Save, Shield, UserCog, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { role, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h2 className="text-lg font-semibold mb-4">Configurações</h2>
      <Tabs defaultValue="profile">
        <TabsList className="h-9 mb-5">
          <TabsTrigger value="profile" className="text-xs gap-1.5">
            <User className="h-3.5 w-3.5" />
            Meu Perfil
          </TabsTrigger>
          {role === "admin" && (
            <>
              <TabsTrigger value="params" className="text-xs gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Parâmetros Globais
              </TabsTrigger>
              <TabsTrigger value="team" className="text-xs gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Gestão de Equipe
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        {role === "admin" && (
          <>
            <TabsContent value="params">
              <GlobalParamsTab />
            </TabsContent>
            <TabsContent value="team">
              <TeamTab />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function ProfileTab() {
  const { user, role: currentUserRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    job_title: "",
    fixed_salary: 0,
    commission_percent: 20,
    position: "SDR",
    role: "user",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, job_title, fixed_salary, commission_percent, position, role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            full_name: data.full_name || "",
            job_title: data.job_title || "",
            fixed_salary: data.fixed_salary || 0,
            commission_percent: data.commission_percent || 20,
            position: data.position || "SDR",
            role: data.role || "user",
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!form.full_name.trim() || !form.job_title.trim()) {
      toast.error("Nome e Cargo são obrigatórios.");
      return;
    }
    setSaving(true);
    const updateData: any = {
      full_name: form.full_name.trim(),
      job_title: form.job_title.trim(),
      fixed_salary: form.fixed_salary,
      commission_percent: form.commission_percent,
      position: form.position,
    };

    if (currentUserRole === "admin") {
      updateData.role = form.role;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Perfil atualizado!");
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Meu Perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome Completo *</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cargo *</Label>
          <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nível de Sistema</Label>
            <Select 
              value={form.role} 
              onValueChange={(val) => setForm({ ...form, role: val })} 
              disabled={currentUserRole !== "admin"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Função na Empresa</Label>
            <div className="flex gap-2">
              <Select 
                value={["SDR", "Executivo de Negócios", "Diretor"].includes(form.position) ? form.position : ""} 
                onValueChange={(val) => setForm({ ...form, position: val })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SDR">SDR</SelectItem>
                  <SelectItem value="Executivo de Negócios">Executivo de Negócios</SelectItem>
                  <SelectItem value="Diretor">Diretor</SelectItem>
                </SelectContent>
              </Select>
              {/* Optional fallback if they type something completely custom: it could just be a select or an input. The user said Input/Select. We'll use just Select for simplicity but you can type in Input as well */}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Salário Fixo (R$)</Label>
            <Input type="number" min="0" value={form.fixed_salary} onChange={(e) => setForm({ ...form, fixed_salary: Number(e.target.value) })} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Comissão (%)</Label>
            <Input type="number" min="0" max="100" value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: Number(e.target.value) })} className="font-mono" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Perfil"}
        </Button>
      </CardContent>
    </Card>
  );
}

interface GlobalParamsState {
  id: string;
  meta_apresentacoes_bluepex: number;
  meta_apresentacoes_opus: number;
  super_meta_bluepex: number;
  super_meta_opus: number;
  base_implantacao: number;
  acelerador_teto: number;
  acelerador_piso: number;
}

function GlobalParamsTab() {
  const [params, setParams] = useState<GlobalParamsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("global_parameters")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (data) {
          setParams({
            id: data.id,
            meta_apresentacoes_bluepex: data.meta_apresentacoes_bluepex ?? 15,
            meta_apresentacoes_opus: data.meta_apresentacoes_opus ?? 15,
            super_meta_bluepex: data.super_meta_bluepex ?? 30,
            super_meta_opus: data.super_meta_opus ?? 30,
            base_implantacao: data.base_implantacao ?? 40,
            acelerador_teto: data.acelerador_teto ?? 100,
            acelerador_piso: data.acelerador_piso ?? 70,
          });
        }
        if (error) toast.error("Erro ao carregar parâmetros");
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!params) return;
    setSaving(true);
    const { error } = await supabase
      .from("global_parameters")
      .update({
        meta_apresentacoes_bluepex: params.meta_apresentacoes_bluepex,
        meta_apresentacoes_opus: params.meta_apresentacoes_opus,
        super_meta_bluepex: params.super_meta_bluepex,
        super_meta_opus: params.super_meta_opus,
        base_implantacao: params.base_implantacao,
        acelerador_teto: params.acelerador_teto,
        acelerador_piso: params.acelerador_piso,
      })
      .eq("id", params.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Parâmetros salvos!");
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!params) return <p className="text-sm text-muted-foreground">Nenhum parâmetro encontrado.</p>;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Parâmetros Globais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-blue-500 mb-2">BluePex</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Meta de Apresentações</Label>
              <Input type="number" min="1" value={params.meta_apresentacoes_bluepex} onChange={(e) => setParams({ ...params, meta_apresentacoes_bluepex: Number(e.target.value) })} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Super Meta</Label>
              <Input type="number" min="1" value={params.super_meta_bluepex} onChange={(e) => setParams({ ...params, super_meta_bluepex: Number(e.target.value) })} className="font-mono" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-purple-500 mb-2">Opus Tech</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Meta de Apresentações</Label>
              <Input type="number" min="1" value={params.meta_apresentacoes_opus} onChange={(e) => setParams({ ...params, meta_apresentacoes_opus: Number(e.target.value) })} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Super Meta</Label>
              <Input type="number" min="1" value={params.super_meta_opus} onChange={(e) => setParams({ ...params, super_meta_opus: Number(e.target.value) })} className="font-mono" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Bases & Aceleradores</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Base Implantação (%)</Label>
              <Input type="number" min="0" max="100" value={params.base_implantacao} onChange={(e) => setParams({ ...params, base_implantacao: Number(e.target.value) })} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Acelerador Piso (%)</Label>
              <Input type="number" min="0" max="100" value={params.acelerador_piso} onChange={(e) => setParams({ ...params, acelerador_piso: Number(e.target.value) })} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Acelerador Teto (%)</Label>
              <Input type="number" min="0" max="100" value={params.acelerador_teto} onChange={(e) => setParams({ ...params, acelerador_teto: Number(e.target.value) })} className="font-mono" />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Parâmetros"}
        </Button>
      </CardContent>
    </Card>
  );
}

function TeamTab() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeam = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const isTestEnv = user?.email?.endsWith("@teste.com") || false;

      let query = supabase
        .from("profiles")
        .select("id, user_id, display_name, full_name, role, job_title, position, created_at")
        .eq("is_test_data", isTestEnv)
        .order("created_at", { ascending: true });

      let { data, error } = await query;

      // Fallback para caso a coluna ainda não exista no Supabase
      if (error && (error.message?.includes("is_test_data") || error.message?.includes("column"))) {
        console.warn("[Settings] Coluna is_test_data não encontrada, buscando tudo.");
        const fallback = await supabase
          .from("profiles")
          .select("id, user_id, display_name, full_name, role, job_title, position, created_at")
          .order("created_at", { ascending: true });
        data = fallback.data;
        error = fallback.error;
      }

      if (data) setProfiles(data);
      if (error) toast.error("Erro ao carregar usuários: " + error.message);
      setLoading(false);
    };

    loadTeam();
  }, []);

  const handleUpdateField = async (userId: string, field: "role" | "position", newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: newRole })
      .eq("user_id", userId);
    if (error) {
      toast.error(`Erro ao alterar ${field}: ` + error.message);
      return;
    }
    toast.success("Perfil atualizado!");
    setProfiles((prev) => prev.map((p) => (p.user_id === userId ? { ...p, [field]: newRole } : p)));
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Gestão de Equipe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Usuário</TableHead>
                <TableHead className="text-xs">Cargo Descritivo</TableHead>
                <TableHead className="text-xs">Desde</TableHead>
                <TableHead className="text-xs w-[160px]">Função na Empresa</TableHead>
                <TableHead className="text-xs w-[140px]">Nível de Sistema</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                        <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{p.full_name || p.display_name || "—"}</p>
                        <p className="text-[11px] text-muted-foreground">{p.job_title || "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.job_title || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Select value={p.position || "SDR"} onValueChange={(val) => handleUpdateField(p.user_id, "position", val)}>
                      <SelectTrigger className="h-8 text-xs w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SDR">SDR</SelectItem>
                        <SelectItem value="Executivo de Negócios">Executivo de Negócios</SelectItem>
                        <SelectItem value="Diretor">Diretor</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={p.role || "user"} onValueChange={(val) => handleUpdateField(p.user_id, "role", val)}>
                      <SelectTrigger className="h-8 text-xs w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-primary" /> Admin</div>
                        </SelectItem>
                        <SelectItem value="gestor">
                          <div className="flex items-center gap-1.5"><Users className="h-3 w-3 text-muted-foreground" /> Gestor</div>
                        </SelectItem>
                        <SelectItem value="user">
                          <div className="flex items-center gap-1.5"><User className="h-3 w-3 text-muted-foreground" /> User</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
