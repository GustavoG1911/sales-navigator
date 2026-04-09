import { supabase } from "@/integrations/supabase/client";
import { Deal } from "./types";

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");
  return user.id;
}
interface DbDeal {
  id: string;
  client_name: string;
  operation: string;
  monthly_value: number;
  implantation_value: number;
  closing_date: string;
  first_payment_date: string | null;
  implantation_payment_date: string | null;
  is_installment: boolean;
  installment_count: number;
  installment_dates: any;
  payment_status: string;
  created_at: string;
  updated_at: string;
  is_user_confirmed_payment?: boolean;
  is_mensalidade_paid_by_client?: boolean;
  is_paid_to_user?: boolean;
}

function dbToDeal(row: DbDeal): Deal {
  return {
    id: row.id,
    closingDate: new Date(row.closing_date).toISOString(),
    operation: row.operation as Deal["operation"],
    clientName: row.client_name,
    monthlyValue: Number(row.monthly_value),
    implantationValue: Number(row.implantation_value),
    firstPaymentDate: row.first_payment_date ? new Date(row.first_payment_date).toISOString() : new Date(row.closing_date).toISOString(),
    implantationPaymentDate: row.implantation_payment_date ? new Date(row.implantation_payment_date).toISOString() : new Date(row.closing_date).toISOString(),
    isInstallment: row.is_installment,
    installmentCount: row.installment_count,
    installmentDates: Array.isArray(row.installment_dates) ? row.installment_dates : [],
    paymentStatus: row.payment_status as Deal["paymentStatus"],
    userId: (row as any).user_id,
    commissionAmountSnapshot: row.commission_amount_snapshot,
    commissionRateSnapshot: row.commission_rate_snapshot,
    isUserConfirmedPayment: row.is_user_confirmed_payment,
    isMensalidadePaidByClient: row.is_mensalidade_paid_by_client,
    isPaidToUser: row.is_paid_to_user,
  };
}

function dealToDb(deal: Deal) {
  return {
    client_name: deal.clientName,
    operation: deal.operation,
    monthly_value: deal.monthlyValue,
    implantation_value: deal.implantationValue,
    closing_date: deal.closingDate.slice(0, 10),
    first_payment_date: deal.firstPaymentDate?.slice(0, 10) || null,
    implantation_payment_date: deal.implantationPaymentDate?.slice(0, 10) || null,
    is_installment: deal.isInstallment,
    installment_count: deal.installmentCount,
    installment_dates: deal.installmentDates,
    payment_status: deal.paymentStatus,
    user_id: deal.userId,
    commission_amount_snapshot: deal.commissionAmountSnapshot,
    commission_rate_snapshot: deal.commissionRateSnapshot,
    is_user_confirmed_payment: deal.isUserConfirmedPayment,
  };
}

export async function fetchDeals(): Promise<Deal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const isTestEnv = user?.email?.endsWith("@teste.com") || false;

  const { data, error } = await supabase
    .from("deals" as any)
    .select("*")
    .eq("is_test_data", isTestEnv)
    .order("closing_date", { ascending: false });

  if (error) throw error;
  return ((data as any[]) || []).map(dbToDeal);
}

export async function upsertDeal(deal: Deal): Promise<Deal> {
  const userId = await getCurrentUserId();
  const payload = dealToDb(deal);

  // Check if deal already exists (UUID from DB vs generated ID)
  const isExisting = deal.id && deal.id.includes("-") && deal.id.length > 10;

  if (isExisting) {
    const { data, error } = await supabase
      .from("deals" as any)
      .update(payload as any)
      .eq("id", deal.id)
      .select()
      .single();
    if (error) throw error;
    return dbToDeal(data as any);
  } else {
    // Generate snapshot on creation
    const { data: profile } = await supabase
      .from("profiles")
      .select("commission_percent")
      .eq("user_id", userId)
      .single();
      
    const snapshotRate = (profile?.commission_percent || 20) / 100;
    const mv = deal.monthlyValue || 0;
    const iv = deal.implantationValue || 0;
    const snapshotAmount = (mv * snapshotRate) + (iv * 0.4 * snapshotRate);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const isTestEnv = authUser?.email?.endsWith("@teste.com") || false;

    const insertPayload = { 
      ...payload, 
      user_id: userId,
      commission_rate_snapshot: snapshotRate,
      commission_amount_snapshot: snapshotAmount,
      is_user_confirmed_payment: false,
      is_test_data: isTestEnv
    };

    const { data, error } = await supabase
      .from("deals" as any)
      .insert(insertPayload as any)
      .select()
      .single();
    if (error) throw error;
    return dbToDeal(data as any);
  }
}

export async function deleteDealFromDb(id: string): Promise<void> {
  const { error } = await supabase
    .from("deals" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function seedHistoricalData(): Promise<number> {
  const userId = await getCurrentUserId();
  const seedData = [
    { client_name: "AIZ", operation: "BluePex", monthly_value: 1160.0, implantation_value: 1500.0, closing_date: "2025-01-15", first_payment_date: "2025-02-01", payment_status: "Pago", user_id: userId },
    { client_name: "Unicooper", operation: "BluePex", monthly_value: 2739.54, implantation_value: 3975.0, closing_date: "2025-01-15", first_payment_date: "2025-02-01", payment_status: "Pago", user_id: userId },
    { client_name: "Kempart", operation: "BluePex", monthly_value: 1026.94, implantation_value: 0.0, closing_date: "2025-01-15", first_payment_date: "2025-02-01", payment_status: "Pago", user_id: userId },
    { client_name: "Zin Foods", operation: "BluePex", monthly_value: 1169.8, implantation_value: 0.0, closing_date: "2025-05-15", first_payment_date: "2025-06-01", payment_status: "Pago", user_id: userId },
    { client_name: "Zin Foods", operation: "BluePex", monthly_value: 398.75, implantation_value: 0.0, closing_date: "2025-05-15", first_payment_date: "2025-06-01", payment_status: "Pago", user_id: userId },
    { client_name: "Zin Foods", operation: "BluePex", monthly_value: 63.0, implantation_value: 0.0, closing_date: "2025-05-15", first_payment_date: "2025-06-01", payment_status: "Pago", user_id: userId },
    { client_name: "Gmaster", operation: "BluePex", monthly_value: 1003.11, implantation_value: 1500.0, closing_date: "2025-05-15", first_payment_date: "2025-06-01", payment_status: "Pago", user_id: userId },
    { client_name: "Arteleste", operation: "BluePex", monthly_value: 1800.8, implantation_value: 750.0, closing_date: "2025-06-15", first_payment_date: "2025-07-01", payment_status: "Pago", user_id: userId },
    { client_name: "Techcert", operation: "BluePex", monthly_value: 1076.4, implantation_value: 862.5, closing_date: "2025-07-15", first_payment_date: "2025-08-01", payment_status: "Pago", user_id: userId },
    { client_name: "Grupo AIZ", operation: "BluePex", monthly_value: 2900.0, implantation_value: 0.0, closing_date: "2025-08-15", first_payment_date: "2025-09-01", payment_status: "Pago", user_id: userId },
    { client_name: "Frooty", operation: "BluePex", monthly_value: 8000.0, implantation_value: 7350.0, closing_date: "2025-12-15", first_payment_date: "2026-01-01", payment_status: "Pago", user_id: userId },
  ];

  const { data, error } = await supabase
    .from("deals" as any)
    .insert(seedData as any)
    .select();

  if (error) throw error;
  return (data as any[])?.length || 0;
}
