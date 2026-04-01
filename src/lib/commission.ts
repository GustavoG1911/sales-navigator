import { CommissionBreakdown, Deal } from "./types";

export function calculateCommission(
  deal: Deal,
  presentations: number
): CommissionBreakdown {
  const meetsTarget = presentations >= 15;
  const monthlyBase = deal.monthlyValue * (meetsTarget ? 1 : 0.7);
  const monthlyCommission = monthlyBase * 0.2;

  const implantationBase = deal.implantationValue * 0.4;
  const implantationCommission = implantationBase * 0.2;

  return {
    monthlyBase,
    monthlyCommission,
    implantationBase,
    implantationCommission,
    totalCommission: monthlyCommission + implantationCommission,
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
