import { CommissionBreakdown, Deal, AppSettings, MonthlyPresentations } from "./types";

const DEFAULT_COMMISSION_RATE = 0.20;

/**
 * Calculate commission for a deal.
 * @param deal The deal
 * @param presentationsForOperation Number of presentations for this deal's operation in its closing month
 * @param settings App settings
 * @param superMetaActive Whether super meta is active for this month
 */
export function calculateCommission(
  deal: Deal,
  presentationsForOperation: number,
  settings?: AppSettings,
  superMetaActive?: boolean
): CommissionBreakdown {
  const rate = settings?.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const meetsTarget = presentationsForOperation >= 15;
  const baseRate = meetsTarget ? 1 : 0.7;
  const monthlyBase = deal.monthlyValue * baseRate;
  const monthlyCommission = monthlyBase * rate;

  const implantationBase = deal.implantationValue * 0.4;
  const implantationCommission = implantationBase * rate;

  let superMetaBonus = 0;
  if (superMetaActive && settings) {
    const threshold = settings.superMetaThreshold || 30;
    if (presentationsForOperation >= threshold) {
      superMetaBonus = ((settings.superMetaMultiplier || 2) - 1) * monthlyCommission;
    }
  }

  return {
    monthlyBase,
    monthlyBaseRate: baseRate,
    monthlyCommission,
    implantationBase,
    implantationCommission,
    superMetaBonus,
    totalCommission: monthlyCommission + implantationCommission + superMetaBonus,
    commissionRate: rate,
  };
}

/**
 * Get the presentations count for a specific deal based on its operation and closing month.
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

/**
 * Given a deal's closing month, returns the month key when its commission is payable.
 * Commission is paid by the 20th of the NEXT month.
 */
export function getPayableMonthKey(closingDate: string): string {
  const d = new Date(closingDate);
  d.setMonth(d.getMonth() + 1);
  return getMonthKey(d);
}
