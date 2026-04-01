export type Operation = "BluePex" | "Opus Tech";

export type PaymentStatus = "Pendente" | "Pago" | "Cancelado";

export interface InstallmentDate {
  date: string; // ISO string
}

export interface Deal {
  id: string;
  closingDate: string;
  operation: Operation;
  clientName: string;
  monthlyValue: number;
  implantationValue: number;
  firstPaymentDate: string;
  implantationPaymentDate: string;
  isInstallment: boolean;
  installmentCount: number;
  installmentDates: InstallmentDate[];
  paymentStatus: PaymentStatus;
}

export interface MonthlyPresentations {
  [monthKey: string]: number; // "2026-04" -> 15
}

export interface MonthlySuperMeta {
  [monthKey: string]: boolean; // "2026-04" -> true (activated)
}

export interface AppSettings {
  fixedSalary: number;
  commissionRate: number; // e.g. 0.20 for 20%
  superMetaThreshold: number; // presentations needed, default 30
  superMetaMultiplier: number; // multiplier on monthly commission, default 2 (200%)
}

export interface CommissionBreakdown {
  monthlyBase: number;
  monthlyCommission: number;
  implantationBase: number;
  implantationCommission: number;
  superMetaBonus: number;
  totalCommission: number;
}

export interface ReceivableAdjustment {
  id: string; // matches receivable entry id
  adjustment: number;
  reason: string;
  effectiveDate: string; // ISO date override
}

export interface ReceivableAdjustments {
  [entryId: string]: ReceivableAdjustment;
}
