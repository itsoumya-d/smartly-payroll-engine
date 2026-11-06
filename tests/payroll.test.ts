import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  calculatePay,
  formatNZD,
  processPayRun,
  progressiveTax,
  rateFor,
  roundCents,
  type Employee,
  type PayInput,
  type PaySettings,
} from "../src/payroll.js";

function employee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "emp-1",
    name: "Alice Morgan",
    email: "alice@example.com",
    taxCode: "M",
    baseAnnualCents: 5_200_000,
    hourlyRateCents: 5_000,
    kiwiSaverRate: 0.03,
    studentLoan: false,
    payFrequency: "weekly",
    ...overrides,
  };
}

function input(overrides: Partial<PayInput> = {}): PayInput {
  return {
    overtimeHours: 0,
    allowancesCents: 0,
    bonusCents: 0,
    unpaidLeaveHours: 0,
    ...overrides,
  };
}

describe("NZ payroll engine", () => {
  it("calculates weekly base pay from annual salary", () => {
    const line = calculatePay(employee(), input());
    expect(line.baseCents).toBe(100_000);
    expect(line.grossCents).toBe(100_000);
  });

  it("calculates progressive PAYE on annualised gross", () => {
    const line = calculatePay(employee(), input());
    expect(line.payeCents).toBe(15_400);
  });

  it("calculates ACC earner levy", () => {
    const line = calculatePay(employee(), input());
    expect(line.accCents).toBe(1_670);
  });

  it("calculates employee KiwiSaver at the selected rate", () => {
    const line = calculatePay(employee({ kiwiSaverRate: 0.06 }), input());
    expect(line.employeeKiwiSaverCents).toBe(6_000);
  });

  it("calculates employer KiwiSaver and employer cost", () => {
    const line = calculatePay(employee(), input());
    expect(line.employerKiwiSaverCents).toBe(3_000);
    expect(line.employerCostCents).toBe(103_000);
  });

  it("calculates net pay after PAYE, ACC and KiwiSaver", () => {
    const line = calculatePay(employee(), input());
    expect(line.netCents).toBe(79_930);
  });

  it("pays overtime at 1.5x", () => {
    const line = calculatePay(employee(), input({ overtimeHours: 4 }));
    expect(line.overtimeCents).toBe(30_000);
    expect(line.grossCents).toBe(130_000);
  });

  it("adds taxable allowances and bonuses", () => {
    const line = calculatePay(employee(), input({ allowancesCents: 5_000, bonusCents: 10_000 }));
    expect(line.grossCents).toBe(115_000);
  });

  it("deducts unpaid leave from gross", () => {
    const line = calculatePay(employee(), input({ unpaidLeaveHours: 2 }));
    expect(line.unpaidLeaveCents).toBe(10_000);
    expect(line.grossCents).toBe(90_000);
  });

  it("does not allow negative hours or deductions to create extra pay", () => {
    const line = calculatePay(employee(), input({ overtimeHours: -4, allowancesCents: -100, bonusCents: -100, unpaidLeaveHours: -2 }));
    expect(line.grossCents).toBe(100_000);
  });

  it("uses the 10.5% first PAYE bracket", () => {
    const line = calculatePay(employee({ baseAnnualCents: 1_560_000 }), input());
    expect(line.payeCents).toBe(3_150);
  });

  it("applies the 17.5% bracket at the next band", () => {
    const line = calculatePay(employee({ baseAnnualCents: 5_350_000 }), input());
    expect(line.payeCents).toBe(15_905);
  });

  it("applies the top 39% PAYE bracket", () => {
    const line = calculatePay(employee({ baseAnnualCents: 20_000_000, payFrequency: "monthly" }), input());
    expect(line.payeCents).toBe(475_646);
  });

  it("caps the ACC levy at the annual cap", () => {
    const low = calculatePay(employee({ baseAnnualCents: 10_000_000, payFrequency: "monthly" }), input());
    const high = calculatePay(employee({ baseAnnualCents: 20_000_000, payFrequency: "monthly" }), input());
    expect(high.accCents).toBe(21_263);
    expect(low.accCents).toBe(13_917);
  });

  it("selects ESCT from annualised gross", () => {
    const line = calculatePay(employee({ baseAnnualCents: 10_400_000 }), input());
    expect(line.employerKiwiSaverCents).toBe(6_000);
    expect(line.esctCents).toBe(1_980);
  });

  it("calculates student loan above the annual threshold", () => {
    const line = calculatePay(employee({ studentLoan: true, baseAnnualCents: 10_400_000 }), input());
    expect(line.studentLoanCents).toBe(18_432);
  });

  it("does not charge student loan below the threshold", () => {
    const line = calculatePay(employee({ studentLoan: true, baseAnnualCents: 2_000_000 }), input());
    expect(line.studentLoanCents).toBe(0);
  });

  it("supports fortnightly pay periods", () => {
    const line = calculatePay(employee({ payFrequency: "fortnightly", baseAnnualCents: 5_200_000 }), input());
    expect(line.baseCents).toBe(200_000);
  });

  it("supports monthly pay periods", () => {
    const line = calculatePay(employee({ payFrequency: "monthly", baseAnnualCents: 5_200_000 }), input());
    expect(line.baseCents).toBe(433_333);
  });

  it("rounds money to whole cents", () => {
    expect(roundCents(10.4)).toBe(10);
    expect(roundCents(10.5)).toBe(11);
  });

  it("computes progressive tax without mutating brackets", () => {
    const before = JSON.stringify(DEFAULT_SETTINGS.payeBrackets);
    expect(progressiveTax(5_200_000, DEFAULT_SETTINGS.payeBrackets)).toBe(800_800);
    expect(JSON.stringify(DEFAULT_SETTINGS.payeBrackets)).toBe(before);
  });

  it("finds the marginal rate for an annual gross", () => {
    expect(rateFor(1_000_000, DEFAULT_SETTINGS.payeBrackets)).toBe(0.105);
    expect(rateFor(20_000_000, DEFAULT_SETTINGS.payeBrackets)).toBe(0.39);
  });

  it("aggregates a pay run and employer cost", () => {
    const run = processPayRun(
      [employee(), employee({ id: "emp-2", name: "Ben Carter", baseAnnualCents: 10_400_000 })],
      {
        "emp-1": input(),
        "emp-2": input(),
      },
      "Week 45",
    );
    expect(run.lines).toHaveLength(2);
    expect(run.totals.grossCents).toBe(300_000);
    expect(run.totals.employerCostCents).toBeGreaterThan(run.totals.grossCents);
    expect(run.anomalies).toEqual([]);
  });

  it("flags duplicate employees", () => {
    const run = processPayRun([employee(), employee()], { "emp-1": input() }, "Week 45");
    expect(run.lines).toHaveLength(1);
    expect(run.anomalies.some((item) => item.includes("duplicate employee"))).toBe(true);
  });

  it("flags missing pay input", () => {
    const run = processPayRun([employee()], {}, "Week 45");
    expect(run.anomalies.some((item) => item.includes("no pay input"))).toBe(true);
  });

  it("flags excessive overtime", () => {
    const run = processPayRun([employee()], { "emp-1": input({ overtimeHours: 24 }) }, "Week 45");
    expect(run.anomalies.some((item) => item.includes("overtime exceeds"))).toBe(true);
  });

  it("flags a missing tax code", () => {
    const run = processPayRun([employee({ taxCode: " " })], { "emp-1": input() }, "Week 45");
    expect(run.anomalies.some((item) => item.includes("tax code is missing"))).toBe(true);
  });

  it("flags zero gross pay", () => {
    const run = processPayRun([employee({ baseAnnualCents: 0 })], { "emp-1": input() }, "Week 45");
    expect(run.anomalies.some((item) => item.includes("gross pay is zero"))).toBe(true);
  });

  it("flags an empty pay run", () => {
    const run = processPayRun([], {}, "Week 45");
    expect(run.anomalies).toContain("pay run has no employees");
    expect(run.totals.grossCents).toBe(0);
  });

  it("flags negative net pay under extreme deductions", () => {
    const settings: PaySettings = {
      ...DEFAULT_SETTINGS,
      payeBrackets: [{ upToCents: null, rate: 1 }],
    };
    const run = processPayRun(
      [employee({ kiwiSaverRate: 0.1, studentLoan: true })],
      { "emp-1": input() },
      "Week 45",
      settings,
    );
    expect(run.anomalies.some((item) => item.includes("net pay is negative"))).toBe(true);
  });

  it("formats NZD values", () => {
    expect(formatNZD(123_456)).toBe("$1,234.56");
  });
});
