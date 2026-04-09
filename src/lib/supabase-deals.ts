import { supabase } from "@/integrations/supabase/client";
import { Deal, PaymentStatus } from "./types";
import { UserRole } from "@/hooks/useAuth";

const dbToDeal = (db: any): Deal => ({
  id: db.id,
  clientName: db.client_name,
  operation: db.operation,
  closingDate: db.closing_date,
  implantationValue: db.implantation_value,
  monthlyValue: db.monthly_value,
  isImplantacao_paid_by_client: db.is_implantacao_paid_by_client,
  isMensalidadePaidByClient: db.is_mensalidade_paid_by_client,
  isPaidToUser: db.is_paid_to_user,
  isUserConfirmedPayment: db.is_user_confirmed_payment,
  userId: db.user_id,
  implantationPaymentDate: db.implantation_payment_date,
  firstPaymentDate: db.first_payment_date,
  commission_amount_snapshot: db.commission_amount_snapshot,
  commission_rate_snapshot: db.commission_rate_snapshot,
});

const dealToDb = (deal: Partial<Deal>) => ({
  id: deal.id,
  client_name: deal.clientName,
  operation: deal.operation,
  closing_date: deal.closingDate,
  implantation_value: deal.implantationValue,
  monthly_value: deal.monthlyValue,
  is_implantacao_paid_by_client: deal.isImplantationPaidByClient,
  is_mensalidade_paid_by_client: deal.isMensalidadePaidByClient,
  is_paid_to_user: deal.isPaidToUser,
  is_user_confirmed_payment: deal.isUserConfirmedPayment,
  user_id: deal.userId,
  implantation_payment_date: deal.implantationPaymentDate,
  first_payment_date: deal.firstPaymentDate,
  commission_amount_snapshot: deal.commissionAmountSnapshot,
  commission_rate_snapshot: deal.commissionRateSnapshot,
  payment_status: deal.paymentStatus,
});

export async function fetchDeals(role: UserRole, userId?: string): Promise<Deal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const isTestEnv = user?.email?.endsWith("@teste.com") || false;
  
  console.log(`[fetchDeals] Buscando dados para ambiente: ${isTestEnv ? "TESTE 🧪" : "PRODUÇÃO 🚀"} (User: ${user?.email}, Role: ${role})`);

  let query = supabase
    .from("deals")
    .select("*")
    .eq("is_test_data", isTestEnv);

  // Filtro de segurança: Se não for admin, vê apenas o dele
  if (role !== "admin") {
    // Se não for admin, OBRIGATORIAMENTE filtra pelo userId logado
    // Se userId for nulo por algum motivo, não retorna nada (segurança)
    query = query.eq("user_id", userId || "no-access-placeholder");
  }

  let res = await query.order("closing_date", { ascending: false });

  if (res.error) {
    console.error("[fetchDeals] Erro na busca principal:", res.error);
    // Fallback: busca sem filtro se der erro de coluna
    let fallbackQuery = supabase.from("deals").select("*");
    if (role !== "admin") {
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
  const { data, error } = await supabase.from("deals").upsert(payload).select().single();

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

export async function fetchAvailableYears(email: string): Promise<number[]> {
  const isTestEnv = email.endsWith("@teste.com");
  const { data, error } = await supabase
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
