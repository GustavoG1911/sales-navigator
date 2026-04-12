import { supabase } from "@/integrations/supabase/client";
import { Deal, PaymentStatus, MonthlyPresentations } from "./types";
import { UserRole } from "@/hooks/useAuth";

const dbToDeal = (db: any): Deal => ({
  id: db.id,
  clientName: db.client_name,
  operation: db.operation,
  closingDate: db.closing_date,
  implantationValue: db.implantation_value,
  monthlyValue: db.monthly_value,
  isImplantacaoPaid: db.is_implantacao_paid,
  isMensalidadePaid: db.is_mensalidade_paid,
  isMensalidadePaidByClient: db.is_mensalidade_paid_by_client,
  isPaidToUser: db.is_paid_to_user,
  isUserConfirmedPayment: db.is_user_confirmed_payment,
  userId: db.user_id,
  implantationPaymentDate: db.implantation_payment_date,
  firstPaymentDate: db.first_payment_date,
  commissionRateSnapshot: db.commission_rate_snapshot,
  commissionAmountSnapshot: db.commission_amount_snapshot,
  isTestData: db.is_test_data,
  isInstallment: db.is_installment || false,
  installmentCount: db.installment_count || 0,
  installmentDates: db.installment_dates || [],
  paymentStatus: db.payment_status || "Pendente",
});

const dealToDb = (deal: Partial<Deal>) => ({
  id: deal.id,
  client_name: deal.clientName,
  operation: deal.operation,
  closing_date: deal.closingDate,
  implantation_value: deal.implantationValue,
  monthly_value: deal.monthlyValue,
  is_implantacao_paid: deal.isImplantacaoPaid,
  is_mensalidade_paid: deal.isMensalidadePaid,
  is_paid_to_user: deal.isPaidToUser,
  is_user_confirmed_payment: deal.isUserConfirmedPayment,
  is_mensalidade_paid_by_client: deal.isMensalidadePaidByClient,
  is_installment: deal.isInstallment,
  installment_count: deal.installmentCount,
  installment_dates: deal.installmentDates,
  user_id: deal.userId,
  implantation_payment_date: deal.implantationPaymentDate,
  first_payment_date: deal.firstPaymentDate,
  commission_amount_snapshot: deal.commissionAmountSnapshot,
  commission_rate_snapshot: deal.commissionRateSnapshot,
  payment_status: deal.paymentStatus,
  is_test_data: deal.isTestData,
});

export async function fetchDeals(role: UserRole, userId?: string, position?: string): Promise<Deal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const isTestEnv = user?.email?.endsWith("@teste.com") || false;

  console.log(`[fetchDeals] Buscando dados para ambiente: ${isTestEnv ? "TESTE 🧪" : "PRODUÇÃO 🚀"} (User: ${user?.email}, Role: ${role}, Position: ${position})`);

  // Pré-buscar UUIDs de executivos se o usuário for SDR
  // Nota: profiles NÃO tem coluna is_test_data — é dado global compartilhado
  let executivoIds: string[] = [];
  if (position === "SDR") {
    const { data: executivos, error: execErr } = await (supabase as any)
      .from("profiles")
      .select("user_id")
      .eq("position", "Executivo de Negócios");
    if (execErr) {
      console.error("[fetchDeals] Erro ao buscar executivos para SDR:", execErr.message);
    }
    executivoIds = (executivos || []).map((p: any) => p.user_id);
    console.log(`[fetchDeals] Executivos encontrados para SDR: ${executivoIds.length}`, executivoIds);
  }

  let query = (supabase as any)
    .from("deals")
    .select("*")
    .eq("is_test_data", isTestEnv);

  // Filtro de visibilidade baseado em cargo (position)
  if (position === "Diretor") {
    // Diretor vê todos os deals — sem filtro de user_id
  } else if (position === "SDR") {
    // SDR vê deals de todos os Executivos de Negócios
    query = executivoIds.length > 0
      ? query.in("user_id", executivoIds)
      : query.eq("user_id", "no-access-placeholder");
  } else {
    // Executivo de Negócios ou fallback — vê apenas os próprios deals
    query = query.eq("user_id", userId || "no-access-placeholder");
  }

  let res = await query.order("closing_date", { ascending: false });

  if (res.error) {
    console.error("[fetchDeals] Erro na busca principal:", res.error);
    // Fallback: busca sem filtro se der erro de coluna
    let fallbackQuery = (supabase as any).from("deals").select("*");
    if (position === "Diretor") {
      // Diretor vê tudo
    } else if (position === "SDR") {
      fallbackQuery = executivoIds.length > 0
        ? fallbackQuery.in("user_id", executivoIds)
        : fallbackQuery.eq("user_id", "no-access-placeholder");
    } else {
      fallbackQuery = fallbackQuery.eq("user_id", userId || "no-access-placeholder");
    }
    res = await fallbackQuery.order("closing_date", { ascending: false });
  }

  console.log(`[fetchDeals] Negócios encontrados: ${res.data?.length || 0}`);
  return (res.data || []).map(dbToDeal);
}

export async function upsertDeal(deal: Deal): Promise<Deal> {
  const { data: { user } } = await supabase.auth.getUser();
  const isTestEnv = user?.email?.endsWith("@teste.com") || false;

  const payload = {
    ...dealToDb(deal),
    is_test_data: isTestEnv,
    // Garante user_id: usa o do deal (Diretor pode atribuir a Executivo) ou o usuário atual
    // ?? em vez de || para não substituir string vazia acidentalmente
    user_id: deal.userId ?? user?.id,
  };
  const { data, error } = await (supabase as any).from("deals").upsert(payload).select().single();

  if (error) {
    console.error("Error upserting deal:", error);
    throw error;
  }
  return dbToDeal(data);
}

export async function deleteDealFromDb(id: string): Promise<void> {
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAvailableYears(): Promise<number[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const isTestEnv = user?.email?.endsWith("@teste.com") || false;
  const { data, error } = await (supabase as any)
    .from("deals")
    .select("closing_date")
    .eq("is_test_data", isTestEnv);

  if (error) {
    console.error("Error fetching available years:", error);
    return [new Date().getFullYear()];
  }

  const years = new Set<number>();
  data?.forEach((d) => {
    if (d.closing_date) {
      years.add(new Date(d.closing_date).getFullYear());
    }
  });

  // Fallback to current year if empty
  if (years.size === 0) {
    years.add(new Date().getFullYear());
  }

  return Array.from(years).sort((a, b) => b - a);
}

// Schema real da tabela presentations:
// id, user_id, operation ("BluePex" | "Opus Tech"), count, date ("YYYY-MM-DD"), is_test_data
// Uma linha por operação por mês — contador global compartilhado entre todos os cargos.

export async function fetchPresentations(role: UserRole, userId?: string, position?: string): Promise<MonthlyPresentations> {
  const { data: { user } } = await supabase.auth.getUser();
  const isTestEnv = user?.email?.endsWith("@teste.com") || false;

  // Apresentações são globais: todos os cargos veem o mesmo contador.
  const { data, error } = await (supabase as any)
    .from("presentations")
    .select("operation, count, date")
    .eq("is_test_data", isTestEnv);

  if (error) {
    console.error("[fetchPresentations] Erro:", error);
    return {};
  }

  const result: MonthlyPresentations = {};
  data?.forEach((p: any) => {
    // date = "YYYY-MM-DD" → monthKey = "YYYY-MM"
    const key = (p.date as string).slice(0, 7);
    if (!result[key]) result[key] = { bluepex: 0, opus: 0 };
    if (p.operation === "BluePex") result[key].bluepex += p.count ?? 0;
    else result[key].opus += p.count ?? 0;
  });

  return result;
}

export async function savePresentationToDb(monthKey: string, operation: "bluepex" | "opus", count: number, userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const isTestEnv = user?.email?.endsWith("@teste.com") || false;

  // Mapeia o campo frontend para o valor da coluna operation no banco
  const dbOperation = operation === "bluepex" ? "BluePex" : "Opus Tech";
  // Usa o primeiro dia do mês como data canônica
  const dateStr = monthKey + "-01";

  // Busca linha canônica do mês+operação (global, ignora user_id)
  const { data: existing, error: readErr } = await (supabase as any)
    .from("presentations")
    .select("id")
    .eq("date", dateStr)
    .eq("operation", dbOperation)
    .eq("is_test_data", isTestEnv)
    .limit(1)
    .maybeSingle();

  if (readErr) throw readErr;

  if (existing?.id) {
    // Atualiza a linha existente pelo id
    const { error: updateErr } = await (supabase as any)
      .from("presentations")
      .update({ count })
      .eq("id", existing.id);
    if (updateErr) throw updateErr;
  } else {
    // Insere nova linha para este mês+operação
    const { error: insertErr } = await (supabase as any)
      .from("presentations")
      .insert({
        user_id: userId,
        operation: dbOperation,
        count,
        date: dateStr,
        is_test_data: isTestEnv,
      });
    if (insertErr) throw insertErr;
  }
}

export async function fetchUserCommissionRate(userId: string): Promise<number | null> {
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("commission_percent")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data || data.commission_percent == null) return null;
  return data.commission_percent / 100;
}

export async function saveUserCommissionRate(userId: string, rate: number): Promise<void> {
  const { error } = await (supabase as any)
    .from("profiles")
    .update({ commission_percent: Math.round(rate * 100) })
    .eq("user_id", userId);
  if (error) throw error;
}
