import { describe, expect, it } from "vitest";
import { calculateCommission, COMMISSION_TAX_RATE, getCommissionValueBeforeTax } from "@/lib/commission";
import type { AppSettings, Deal } from "@/lib/types";

const settings: AppSettings = {
  fixedSalary: 0,
  commissionRate: 0.2,
  superMetaThreshold: 30,
  superMetaMultiplier: 2,
  salaryDueDay: 5,
  commissionDueDay: 20,
};

function buildDeal(operation: Deal["operation"]): Deal {
  return {
    id: `deal-${operation}`,
    closingDate: "2026-07-01",
    operation,
    clientName: "Cliente Teste",
    monthlyValue: 1000,
    implantationValue: 500,
    firstPaymentDate: "2026-07-07",
    implantationPaymentDate: "2026-07-07",
    isInstallment: false,
    installmentCount: 0,
    installmentDates: [],
    paymentStatus: "Pendente",
  };
}

describe("commission tax discount", () => {
  it.each(["BluePex", "Opus Tech"] as const)("discounts 20%% for %s", (operation) => {
    const result = calculateCommission(buildDeal(operation), 15, settings);

    expect(result.taxRate).toBe(COMMISSION_TAX_RATE);
    expect(result.monthlyCommissionBeforeTax).toBe(200);
    expect(result.implantationCommissionBeforeTax).toBe(40);
    expect(result.totalCommissionBeforeTax).toBe(240);
    expect(result.taxAmount).toBe(48);
    expect(result.totalCommission).toBe(192);
  });

  it("applies the tax to the super meta bonus", () => {
    const result = calculateCommission(buildDeal("BluePex"), 30, settings);

    expect(result.superMetaBonusBeforeTax).toBe(200);
    expect(result.superMetaTaxAmount).toBe(40);
    expect(result.superMetaBonus).toBe(160);
    expect(result.totalCommissionBeforeTax).toBe(440);
    expect(result.taxAmount).toBe(88);
    expect(result.totalCommission).toBe(352);
  });

  it("recovers the gross value from a post-tax payment", () => {
    expect(getCommissionValueBeforeTax(192)).toBe(240);
  });
});
