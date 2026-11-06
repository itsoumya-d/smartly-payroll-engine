import type { Employee, PayInput } from "./payroll.js";

export const employees: Employee[] = [
  {
    id: "emp-alice",
    name: "Alice Morgan",
    email: "alice.morgan@example.com",
    taxCode: "M",
    baseAnnualCents: 10_400_000,
    hourlyRateCents: 5_000,
    kiwiSaverRate: 0.03,
    studentLoan: true,
    payFrequency: "weekly",
  },
  {
    id: "emp-ben",
    name: "Ben Carter",
    email: "ben.carter@example.com",
    taxCode: "M",
    baseAnnualCents: 13_000_000,
    hourlyRateCents: 6_250,
    kiwiSaverRate: 0.04,
    studentLoan: false,
    payFrequency: "fortnightly",
  },
  {
    id: "emp-chen",
    name: "Chen Wei",
    email: "chen.wei@example.com",
    taxCode: "M",
    baseAnnualCents: 18_000_000,
    hourlyRateCents: 8_654,
    kiwiSaverRate: 0.06,
    studentLoan: false,
    payFrequency: "monthly",
  },
];

export const inputs: Record<string, PayInput> = {
  "emp-alice": { overtimeHours: 4, allowancesCents: 5_000, bonusCents: 10_000, unpaidLeaveHours: 2 },
  "emp-ben": { overtimeHours: 0, allowancesCents: 12_000, bonusCents: 0, unpaidLeaveHours: 0 },
  "emp-chen": { overtimeHours: 8, allowancesCents: 0, bonusCents: 50_000, unpaidLeaveHours: 0 },
};

export const PERIOD_LABEL = "Pay run · 3–9 November 2026";
