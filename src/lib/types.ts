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

export interface OperationPresentations {
  bluepex: number;
  opus: number;
}

export interface MonthlyPresentations {
  [monthKey: string]: OperationPresentations;
}

export interface MonthlySuperMeta {
  [monthKey: string]: boolean;
}

export interface AppSettings {
  fixedSalary: number;
  commissionRate: number;
  superMetaThreshold: number;
  superMetaMultiplier: number;
}

export interface CommissionBreakdown {
  monthlyBase: number;
  monthlyBaseRate: number; // 1.0 or 0.7
  monthlyCommission: number;
  implantationBase: number;
  implantationCommission: number;
  superMetaBonus: number;
  totalCommission: number;
  commissionRate: number; // e.g. 0.20
}

export interface ReceivableAdjustment {
  id: string;
  adjustment: number;
  reason: string;
  effectiveDate: string;
  salaryPaid?: boolean;
}

export interface ReceivableAdjustments {
  [entryId: string]: ReceivableAdjustment;
}
