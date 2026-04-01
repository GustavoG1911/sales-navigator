export type Operation = "BluePex" | "Conecta Suite";

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
  isInstallment: boolean;
  installmentCount: number;
  installmentDates: InstallmentDate[];
  paymentStatus: PaymentStatus;
}

export interface MonthlyPresentations {
  [monthKey: string]: number; // "2026-04" -> 15
}

export interface AppSettings {
  fixedSalary: number;
}

export interface CommissionBreakdown {
  monthlyBase: number;
  monthlyCommission: number;
  implantationBase: number;
  implantationCommission: number;
  totalCommission: number;
}
