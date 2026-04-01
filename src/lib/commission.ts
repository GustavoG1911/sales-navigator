import { CommissionBreakdown, Deal, AppSettings } from "./types";

const DEFAULT_COMMISSION_RATE = 0.20;

export function calculateCommission(
  deal: Deal,
  presentations: number,
  settings?: AppSettings,
  superMetaActive?: boolean
): CommissionBreakdown {
  const rate = settings?.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const meetsTarget = presentations >= 15;
  const monthlyBase = deal.monthlyValue * (meetsTarget ? 1 : 0.7);
  const monthlyCommission = monthlyBase * rate;

  const implantationBase = deal.implantationValue * 0.4;
  const implantationCommission = implantationBase * rate;

  // Super meta: if active and presentations >= threshold, commission on monthly doubles
  let superMetaBonus = 0;
  if (superMetaActive && settings) {
    const threshold = settings.superMetaThreshold || 30;
    if (presentations >= threshold) {
      // Bonus = (multiplier - 1) * monthlyCommission (so total = multiplier * monthlyCommission)
      superMetaBonus = ((settings.superMetaMultiplier || 2) - 1) * monthlyCommission;
    }
  }

  return {
    monthlyBase,
    monthlyCommission,
    implantationBase,
    implantationCommission,
    superMetaBonus,
    totalCommission: monthlyCommission + implantationCommission + superMetaBonus,
  };
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
