import { supabase } from "@/integrations/supabase/client";
import { Deal, PaymentStatus } from "./types";

const dbToDeal = (db: any): Deal => ({
  id: db.id,
  clientName: db.client_name,
  operation: db.operation,
  closingDate: db.closing_date,
  implantationValue: db.implantation_value,
  monthlyValue: db.monthly_value,
  isImplantationPaidByClient: db.is_implantacao_paid_by_client,
  isMensalidadePaidByClient: db.is_mensalidade_paid_by_client,
  isPaidToUser: db.is_paid_to_user,
  isUserConfirmedPayment: db.is_user_confirmed_payment,
  userId: db.user_id,
  implantationPaymentDate: db.implantation_payment_date,
  firstPaymentDate: db.first_payment_date,
  commissionAmountSnapshot: db.commission_amount_snapshot,
  commissionRateSnapshot: db.commission_rate_snapshot,
});

const dealToDb = (deal: Partial<Deal>) => ({
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
});

export async function fetchDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("closing_date", { ascending: false });

  if (error) {
    console.error("Error fetching deals:", error);
    throw error;
  }
  return (data || []).map(dbToDeal);
}

export async function upsertDeal(deal: Deal): Promise<Deal> {
  const { data, error } = await supabase
    .from("deals")
    .upsert(dealToDb(deal))
    .select()
    .single();

  if (error) {
    console.error("Error upserting deal:", error);
    throw error;
  }
  return dbToDeal(data);
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting deal:", error);
    throw error;
  }
}
