import { describe, expect, it } from "vitest";
import { calculateSpainIrpf, IRPF_2026_BRACKETS, netMonthlyCents, SOCIAL_SECURITY_RATE } from "../src/spainIrpf";

describe("Spain IRPF 2026", () => {
  it("taxes zero after the personal allowance", () => {
    expect(calculateSpainIrpf({ grossAnnualCents: 500_000, withheldCents: 0 }).incomeTaxCents).toBe(0);
  });
  it("uses the 19% first bracket", () => {
    const r = calculateSpainIrpf({ grossAnnualCents: 1_800_000, withheldCents: 0, personalAllowanceCents: 555_000 });
    expect(r.taxableIncomeCents).toBe(1_245_000);
    expect(r.incomeTaxCents).toBe(236_550);
  });
  it("crosses into the 24% bracket", () => {
    const r = calculateSpainIrpf({ grossAnnualCents: 2_500_000, withheldCents: 0, personalAllowanceCents: 555_000 });
    expect(r.incomeTaxCents).toBe(236_550 + Math.round((1_945_000 - 1_245_000) * 0.24));
  });
  it("applies social security at 6.35%", () => {
    const r = calculateSpainIrpf({ grossAnnualCents: 1_000_000, withheldCents: 0 });
    expect(r.socialSecurityCents).toBe(Math.round(1_000_000 * SOCIAL_SECURITY_RATE));
  });
  it("calculates a refund when too much was withheld", () => {
    const r = calculateSpainIrpf({ grossAnnualCents: 7_000_000, withheldCents: 3_000_000 });
    expect(r.refundOrOwedCents).toBeGreaterThan(0);
  });
  it("calculates tax owed when withheld is insufficient", () => {
    const r = calculateSpainIrpf({ grossAnnualCents: 7_000_000, withheldCents: 100_000 });
    expect(r.refundOrOwedCents).toBeLessThan(0);
  });
  it("never produces negative taxable income", () => {
    expect(calculateSpainIrpf({ grossAnnualCents: 300_000, withheldCents: 0 }).taxableIncomeCents).toBe(0);
  });
  it("rejects non-positive gross", () => {
    expect(() => calculateSpainIrpf({ grossAnnualCents: 0, withheldCents: 0 })).toThrow();
  });
  it("rejects negative withheld tax", () => {
    expect(() => calculateSpainIrpf({ grossAnnualCents: 100_000, withheldCents: -1 })).toThrow();
  });
  it("rejects a negative allowance", () => {
    expect(() => calculateSpainIrpf({ grossAnnualCents: 100_000, withheldCents: 0, personalAllowanceCents: -1 })).toThrow();
  });
  it("computes monthly net from annual net", () => {
    const r = calculateSpainIrpf({ grossAnnualCents: 7_000_000, withheldCents: 0 });
    expect(netMonthlyCents(r)).toBe(Math.round(r.netAnnualCents / 12));
  });
  it("keeps brackets ordered", () => {
    for (let i = 1; i < IRPF_2026_BRACKETS.length; i++) {
      const prev = IRPF_2026_BRACKETS[i - 1].upToCents;
      const cur = IRPF_2026_BRACKETS[i].upToCents;
      expect(prev === null || cur === null || cur > prev).toBe(true);
    }
  });
});
