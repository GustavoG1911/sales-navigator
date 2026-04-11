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
  let executivoIds: string[] = [];
  if (position === "SDR") {
    const { data: executivos } = await (supabase as any)
      .from("profiles")
      .select("user_id")
      .eq("position", "Executivo de Negócios")
      .eq("is_test_data", isTestEnv);
    executivoIds = (executivos || []).map((p: any) => p.user_id);
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
  
  const payload = { ...dealToDb(deal), is_test_data: isTestEnv };
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

export interface DbPresentation {
  id?: string;
  user_id: string;
  month_key: string;
  bluepex_count: number;
  opus_count: number;
  is_test_data: boolean;
}

export async function fetchPresentations(role: UserRole, userId?: string, position?: string): Promise<MonthlyPresentations> {
  const { data: { user } } = await supabase.auth.getUser();
  const isTestEnv = user?.email?.endsWith("@teste.com") || false;

  // Executivo de Negócios e SDR precisam ver as apresentações da SDR para calcular o tier de comissão
  let sdrIds: string[] = [];
  if (position === "Executivo de Negócios") {
    const { data: sdrs } = await (supabase as any)
      .from("profiles")
      .select("user_id")
      .eq("position", "SDR")
      .eq("is_test_data", isTestEnv);
    sdrIds = (sdrs || []).map((p: any) => p.user_id);
  }

  let query = (supabase as any)
    .from("presentations")
    .select("*")
    .eq("is_test_data", isTestEnv);

  if (position === "Diretor") {
    // Diretor vê todas as presentations — sem filtro de user_id
  } else if (position === "Executivo de Negócios") {
    // Executivo vê as apresentações da SDR para determinar o tier de comissão
    query = sdrIds.length > 0
      ? query.in("user_id", sdrIds)
      : query.eq("user_id", "no-access-placeholder");
  } else {
    // SDR vê as próprias apresentações
    query = query.eq("user_id", userId || user?.id || "no-access-placeholder");
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchPresentations] Erro:", error);
    return {};
  }

  const result: MonthlyPresentations = {};
  data?.forEach((p: any) => {
    // If Admin, we might have multiple users for the same month.
    // We should aggregate them if we want a global view, but useAppData handles the full list.
    // For simplicity, we'll store them by month but we need to decide if we aggregate here or later.
    // If the user selects a specific SDR, we only get their rows.
    const key = p.month_key;
    if (!result[key]) result[key] = { bluepex: 0, opus: 0 };
    result[key].bluepex += p.bluepex_count;
    result[key].opus += p.opus_count;
  });

  return result;
}

export async function savePresentationToDb(monthKey: string, operation: "bluepex" | "opus", count: number, userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const isTestEnv = user?.email?.endsWith("@teste.com") || false;

  const field = operation === "bluepex" ? "bluepex_count" : "opus_count";

  // Try to update an existing row first (handles any duplicates gracefully)
  const { data: updated, error: updateErr } = await (supabase as any)
    .from("presentations")
    .update({ [field]: count })
    .eq("month_key", monthKey)
    .eq("user_id", userId)
    .select("id");

  if (updateErr) throw updateErr;

  // No existing row — insert a fresh one
  if (!updated || updated.length === 0) {
    const { error: insertErr } = await (supabase as any)
      .from("presentations")
      .insert({
        month_key: monthKey,
        user_id: userId,
        is_test_data: isTestEnv,
        bluepex_count: operation === "bluepex" ? count : 0,
        opus_count: operation === "opus" ? count : 0,
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
