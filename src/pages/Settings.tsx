import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, SlidersHorizontal, Save, Shield, UserCog, ArrowLeft, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileRow {
  id: string;
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  role: string | null;
  job_title: string | null;
  created_at: string;
}

interface GlobalParams {
  id: string;
  meta_apresentacoes: number | null;
  base_implantacao: number | null;
  acelerador_teto: number | null;
  acelerador_piso: number | null;
}

export default function Settings() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <DollarSign className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <h1 className="font-bold text-base tracking-tight">DealFlow</h1>
          </div>
          <Button onClick={() => navigate("/")} size="sm" variant="outline" className="h-8 text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container py-5">
        <h2 className="text-lg font-semibold mb-4">Configurações do Sistema</h2>
        <Tabs defaultValue="params">
          <TabsList className="h-9 mb-5">
            <TabsTrigger value="params" className="text-xs gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Parâmetros Globais
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Gestão de Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="params">
            <GlobalParamsTab />
          </TabsContent>
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function GlobalParamsTab() {
  const [params, setParams] = useState<GlobalParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadParams();
  }, []);

  const loadParams = async () => {
    const { data, error } = await supabase
      .from("global_parameters")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) setParams(data);
    if (error) toast.error("Erro ao carregar parâmetros");
    setLoading(false);
  };

  const handleSave = async () => {
    if (!params) return;
    setSaving(true);
    const { error } = await supabase
      .from("global_parameters")
      .update({
        meta_apresentacoes: params.meta_apresentacoes,
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
    toast.success("Parâmetros salvos com sucesso!");
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
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Meta de Apresentações</Label>
            <Input
              type="number"
              min="1"
              value={params.meta_apresentacoes ?? ""}
              onChange={(e) => setParams({ ...params, meta_apresentacoes: Number(e.target.value) })}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Base Implantação (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={params.base_implantacao ?? ""}
              onChange={(e) => setParams({ ...params, base_implantacao: Number(e.target.value) })}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Acelerador Teto (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={params.acelerador_teto ?? ""}
              onChange={(e) => setParams({ ...params, acelerador_teto: Number(e.target.value) })}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Acelerador Piso (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={params.acelerador_piso ?? ""}
              onChange={(e) => setParams({ ...params, acelerador_piso: Number(e.target.value) })}
              className="font-mono"
            />
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

function UsersTab() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, full_name, role, job_title, created_at")
      .order("created_at", { ascending: true });

    if (data) setProfiles(data);
    if (error) toast.error("Erro ao carregar usuários: " + error.message);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      toast.error("Erro ao alterar cargo: " + error.message);
      return;
    }
    toast.success("Cargo atualizado!");
    setProfiles((prev) =>
      prev.map((p) => (p.user_id === userId ? { ...p, role: newRole } : p))
    );
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Gestão de Usuários
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Usuário</TableHead>
                <TableHead className="text-xs">Cargo Funcional</TableHead>
                <TableHead className="text-xs">Desde</TableHead>
                <TableHead className="text-xs w-[150px]">Role</TableHead>
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
                    <Select
                      value={p.role || "sdr"}
                      onValueChange={(val) => handleRoleChange(p.user_id, val)}
                    >
                      <SelectTrigger className="h-8 text-xs w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3 w-3 text-primary" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="sdr">
                          <div className="flex items-center gap-1.5">
                            <UserCog className="h-3 w-3 text-muted-foreground" />
                            SDR
                          </div>
                        </SelectItem>
                        <SelectItem value="gestor">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            Gestor
                          </div>
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
