export type PayFrequency = "weekly" | "fortnightly" | "monthly";
export type Cents = number;

export interface Employee {
  id: string;
  name: string;
  email: string;
  taxCode: string;
  baseAnnualCents: Cents;
  hourlyRateCents: Cents;
  kiwiSaverRate: number;
  studentLoan: boolean;
  payFrequency: PayFrequency;
}

export interface PayInput {
  overtimeHours: number;
  allowancesCents: Cents;
  bonusCents: Cents;
  unpaidLeaveHours: number;
}

export interface TaxBracket {
  upToCents: Cents | null;
  rate: number;
}

export interface PaySettings {
  payeBrackets: TaxBracket[];
  accRate: number;
  accCapCents: Cents;
  kiwiSaverEmployerRate: number;
  esctBrackets: TaxBracket[];
  studentLoanRate: number;
  studentLoanThresholdCents: Cents;
}

export interface PayLine {
  employeeId: string;
  name: string;
  frequency: PayFrequency;
  baseCents: Cents;
  overtimeCents: Cents;
  allowancesCents: Cents;
  bonusCents: Cents;
  unpaidLeaveCents: Cents;
  grossCents: Cents;
  payeCents: Cents;
  accCents: Cents;
  employeeKiwiSaverCents: Cents;
  employerKiwiSaverCents: Cents;
  esctCents: Cents;
  studentLoanCents: Cents;
  netCents: Cents;
  employerCostCents: Cents;
}

export interface PayRun {
  periodLabel: string;
  lines: PayLine[];
  totals: {
    grossCents: Cents;
    payeCents: Cents;
    accCents: Cents;
    employeeKiwiSaverCents: Cents;
    employerKiwiSaverCents: Cents;
    esctCents: Cents;
    studentLoanCents: Cents;
    netCents: Cents;
    employerCostCents: Cents;
  };
  anomalies: string[];
}

export const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
};

export const DEFAULT_SETTINGS: PaySettings = {
  payeBrackets: [
    { upToCents: 1_560_000, rate: 0.105 },
    { upToCents: 5_350_000, rate: 0.175 },
    { upToCents: 7_810_000, rate: 0.3 },
    { upToCents: 18_000_000, rate: 0.33 },
    { upToCents: null, rate: 0.39 },
  ],
  accRate: 0.0167,
  accCapCents: 15_279_000,
  kiwiSaverEmployerRate: 0.03,
  esctBrackets: [
    { upToCents: 1_680_000, rate: 0.105 },
    { upToCents: 5_760_000, rate: 0.175 },
    { upToCents: 8_400_000, rate: 0.3 },
    { upToCents: 21_600_000, rate: 0.33 },
    { upToCents: null, rate: 0.39 },
  ],
  studentLoanRate: 0.12,
  studentLoanThresholdCents: 2_412_800,
};

export function roundCents(value: number): Cents {
  return Math.round(value);
}

export function progressiveTax(annualGrossCents: Cents, brackets: TaxBracket[]): Cents {
  let tax = 0;
  let lower = 0;
  for (const bracket of brackets) {
    const upper = bracket.upToCents ?? annualGrossCents;
    const taxable = Math.max(0, Math.min(annualGrossCents, upper) - lower);
    tax += taxable * bracket.rate;
    if (bracket.upToCents === null || annualGrossCents <= bracket.upToCents) break;
    lower = bracket.upToCents;
  }
  return roundCents(tax);
}

export function rateFor(annualGrossCents: Cents, brackets: TaxBracket[]): number {
  for (const bracket of brackets) {
    if (bracket.upToCents === null || annualGrossCents <= bracket.upToCents) {
      return bracket.rate;
    }
  }
  return brackets[brackets.length - 1]?.rate ?? 0;
}

export function calculatePay(
  employee: Employee,
  input: PayInput,
  settings: PaySettings = DEFAULT_SETTINGS,
): PayLine {
  const periods = PERIODS_PER_YEAR[employee.payFrequency];
  const baseCents = roundCents(employee.baseAnnualCents / periods);
  const overtimeCents = roundCents(Math.max(0, input.overtimeHours) * employee.hourlyRateCents * 1.5);
  const allowancesCents = Math.max(0, roundCents(input.allowancesCents));
  const bonusCents = Math.max(0, roundCents(input.bonusCents));
  const unpaidLeaveCents = roundCents(Math.max(0, input.unpaidLeaveHours) * employee.hourlyRateCents);
  const grossCents = Math.max(0, baseCents + overtimeCents + allowancesCents + bonusCents - unpaidLeaveCents);
  const annualGrossCents = grossCents * periods;
  const annualPayeCents = progressiveTax(annualGrossCents, settings.payeBrackets);
  const payeCents = roundCents(annualPayeCents / periods);
  const accCents = roundCents((Math.min(annualGrossCents, settings.accCapCents) * settings.accRate) / periods);
  const employeeKiwiSaverCents = roundCents(grossCents * employee.kiwiSaverRate);
  const employerKiwiSaverCents = roundCents(grossCents * settings.kiwiSaverEmployerRate);
  const esctCents = employeeKiwiSaverCents === 0
    ? 0
    : roundCents(employerKiwiSaverCents * rateFor(annualGrossCents, settings.esctBrackets));
  const studentLoanCents = employee.studentLoan
    ? roundCents((Math.max(0, annualGrossCents - settings.studentLoanThresholdCents) * settings.studentLoanRate) / periods)
    : 0;
  const netCents = grossCents - payeCents - accCents - employeeKiwiSaverCents - studentLoanCents;

  return {
    employeeId: employee.id,
    name: employee.name,
    frequency: employee.payFrequency,
    baseCents,
    overtimeCents,
    allowancesCents,
    bonusCents,
    unpaidLeaveCents,
    grossCents,
    payeCents,
    accCents,
    employeeKiwiSaverCents,
    employerKiwiSaverCents,
    esctCents,
    studentLoanCents,
    netCents,
    employerCostCents: grossCents + employerKiwiSaverCents,
  };
}

export function processPayRun(
  employees: Employee[],
  inputs: Record<string, PayInput>,
  periodLabel: string,
  settings: PaySettings = DEFAULT_SETTINGS,
): PayRun {
  const seen = new Set<string>();
  const lines: PayLine[] = [];
  const anomalies: string[] = [];
  for (const employee of employees) {
    if (seen.has(employee.id)) {
      anomalies.push(`${employee.name}: duplicate employee id ${employee.id}`);
      continue;
    }
    seen.add(employee.id);
    if (!employee.taxCode.trim()) anomalies.push(`${employee.name}: tax code is missing`);
    if (!inputs[employee.id]) anomalies.push(`${employee.name}: no pay input supplied`);
    const input = inputs[employee.id] ?? { overtimeHours: 0, allowancesCents: 0, bonusCents: 0, unpaidLeaveHours: 0 };
    if (input.overtimeHours > 20) anomalies.push(`${employee.name}: overtime exceeds 20 hours`);
    const line = calculatePay(employee, input, settings);
    if (line.netCents < 0) anomalies.push(`${employee.name}: net pay is negative`);
    if (line.grossCents === 0) anomalies.push(`${employee.name}: gross pay is zero`);
    lines.push(line);
  }
  if (employees.length === 0) anomalies.push("pay run has no employees");

  const totals = lines.reduce(
    (acc, line) => {
      acc.grossCents += line.grossCents;
      acc.payeCents += line.payeCents;
      acc.accCents += line.accCents;
      acc.employeeKiwiSaverCents += line.employeeKiwiSaverCents;
      acc.employerKiwiSaverCents += line.employerKiwiSaverCents;
      acc.esctCents += line.esctCents;
      acc.studentLoanCents += line.studentLoanCents;
      acc.netCents += line.netCents;
      acc.employerCostCents += line.employerCostCents;
      return acc;
    },
    {
      grossCents: 0,
      payeCents: 0,
      accCents: 0,
      employeeKiwiSaverCents: 0,
      employerKiwiSaverCents: 0,
      esctCents: 0,
      studentLoanCents: 0,
      netCents: 0,
      employerCostCents: 0,
    },
  );

  return { periodLabel, lines, totals, anomalies };
}

export function formatNZD(cents: Cents): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
