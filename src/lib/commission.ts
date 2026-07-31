import { CommissionBreakdown, Deal, AppSettings, MonthlyPresentations, GlobalParameters } from "./types";

const DEFAULT_COMMISSION_RATE = 0.20;
export const COMMISSION_TAX_RATE = 0.20;

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getCommissionValueBeforeTax(valueAfterTax: number): number {
  return roundCurrency(valueAfterTax / (1 - COMMISSION_TAX_RATE));
}

/**
 * Get the commission tier rate based on presentations vs thresholds.
 * Returns 0.7, 1.0, or 2.0
 */
export function getCommissionTier(
  presentations: number,
  metaThreshold: number,
  superMetaThreshold: number
): { rate: number; label: string } {
  if (presentations >= superMetaThreshold) {
    return { rate: 2.0, label: "Super Meta (200%)" };
  }
  if (presentations >= metaThreshold) {
    return { rate: 1.0, label: "Meta (100%)" };
  }
  return { rate: 0.7, label: "70%" };
}

/**
 * Calculate commission for a deal using 3-tier independent logic.
 */
export function calculateCommission(
  deal: Deal,
  presentationsForOperation: number,
  settings?: AppSettings,
  _superMetaActive?: boolean // kept for backward compat, now ignored
): CommissionBreakdown {
  const rate = settings?.commissionRate ?? DEFAULT_COMMISSION_RATE;

  // Use strict fixed volumetry as requested
  const metaThreshold = 15;
  const superMetaThreshold = 30;

  const tier = getCommissionTier(presentationsForOperation, metaThreshold, superMetaThreshold);
  const baseRate = Math.min(tier.rate, 1.0); // base is capped at 1.0 for the monthly calc
  const monthlyBase = deal.monthlyValue * baseRate;
  const monthlyCommissionBeforeTax = roundCurrency(monthlyBase * rate);
  const monthlyTaxAmount = roundCurrency(monthlyCommissionBeforeTax * COMMISSION_TAX_RATE);
  const monthlyCommission = roundCurrency(monthlyCommissionBeforeTax - monthlyTaxAmount);

  const implantationBase = deal.implantationValue * 0.4;
  const implantationCommissionBeforeTax = roundCurrency(implantationBase * rate);
  const implantationTaxAmount = roundCurrency(implantationCommissionBeforeTax * COMMISSION_TAX_RATE);
  const implantationCommission = roundCurrency(implantationCommissionBeforeTax - implantationTaxAmount);

  // Super meta bonus: when tier is 2.0, the commission doubles (add another 1x)
  let superMetaBonusBeforeTax = 0;
  if (tier.rate >= 2.0) {
    superMetaBonusBeforeTax = monthlyCommissionBeforeTax; // doubles the monthly commission
  }
  const superMetaTaxAmount = roundCurrency(superMetaBonusBeforeTax * COMMISSION_TAX_RATE);
  const superMetaBonus = roundCurrency(superMetaBonusBeforeTax - superMetaTaxAmount);
  const totalCommissionBeforeTax = roundCurrency(
    monthlyCommissionBeforeTax + implantationCommissionBeforeTax + superMetaBonusBeforeTax
  );
  const taxAmount = roundCurrency(monthlyTaxAmount + implantationTaxAmount + superMetaTaxAmount);
  const totalCommission = roundCurrency(monthlyCommission + implantationCommission + superMetaBonus);

  return {
    monthlyBase,
    monthlyBaseRate: baseRate,
    monthlyCommissionBeforeTax,
    monthlyTaxAmount,
    monthlyCommission,
    implantationBase,
    implantationCommissionBeforeTax,
    implantationTaxAmount,
    implantationCommission,
    superMetaBonusBeforeTax,
    superMetaTaxAmount,
    superMetaBonus,
    totalCommissionBeforeTax,
    taxAmount,
    taxRate: COMMISSION_TAX_RATE,
    totalCommission,
    commissionRate: rate,
  };
}

/**
 * Get the presentations count for a specific deal based on its CLOSING month.
 * The commission tier is determined by the month the deal was signed —
 * the month where the SDR's presentations effort happened.
 * The Regra do Dia 07 controls when money is received, not which goal tier applies.
 */
export function getPresentationsForDeal(
  deal: Deal,
  presentations: MonthlyPresentations
): number {
  const monthKey = getMonthKey(deal.closingDate);
  const monthData = presentations[monthKey] || { bluepex: 0, opus: 0 };
  return deal.operation === "BluePex" ? monthData.bluepex : monthData.opus;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getMonthKey(date: string | Date): string {
  if (typeof date === "string" && /^\d{4}-\d{2}(-\d{2})?$/.test(date)) {
    return date.slice(0, 7);
  }
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export function clampDueDay(day?: number): number {
  const parsed = Math.round(Number(day || 1));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(31, Math.max(1, parsed));
}

export function getDueDateForMonth(monthKey: string, dueDay = 1): string {
  const [year, month] = monthKey.split("-").map(Number);
  const safeDay = clampDueDay(dueDay);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(safeDay, lastDay)).padStart(2, "0")}`;
}

export function getSalaryDueDateForCompetenceMonth(monthKey: string, dueDay = 1): string {
  const [year, month] = monthKey.split("-").map(Number);
  const dueMonth = new Date(year, month, 1);
  return getDueDateForMonth(getMonthKey(dueMonth), dueDay);
}

/**
 * Given a deal's closing month, returns the month key when its commission is payable.
 */
export function getPayableMonthKey(closingDate: string): string {
  const d = new Date(closingDate);
  d.setMonth(d.getMonth() + 1);
  return getMonthKey(d);
}

/**
 * Rule of the 7th (Baseado no Vencimento):
 * If paymentDate day <= 7 -> payable in the SAME month.
 * If paymentDate day > 7 -> payable in the NEXT month.
 */
export function getPaymentDateInfo(paymentDateStr: string, commissionDueDay = 20): { monthKey: string, expectedPaymentDate: string } {
  const d = new Date(paymentDateStr + "T12:00:00");
  const day = d.getDate();
  const targetDate = new Date(paymentDateStr + "T12:00:00");
  
  if (day > 7) {
    targetDate.setMonth(targetDate.getMonth() + 1);
  }
  
  const monthKey = getMonthKey(targetDate);
  const expectedPaymentDate = getDueDateForMonth(monthKey, commissionDueDay);
  
  return { monthKey, expectedPaymentDate };
}
