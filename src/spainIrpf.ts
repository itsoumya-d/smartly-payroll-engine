export type Cents = number;

export interface IrpfBracket {
  upToCents: Cents | null;
  rate: number;
}

export interface SpainIrpfInput {
  grossAnnualCents: Cents;
  withheldCents: Cents;
  personalAllowanceCents?: Cents;
  savingsIncomeCents?: Cents;
}

export interface SpainIrpfResult {
  grossAnnualCents: Cents;
  taxableIncomeCents: Cents;
  incomeTaxCents: Cents;
  socialSecurityCents: Cents;
  netAnnualCents: Cents;
  refundOrOwedCents: Cents;
  effectiveRate: number;
}

export const IRPF_2026_BRACKETS: IrpfBracket[] = [
  { upToCents: 1_245_000, rate: 0.19 },
  { upToCents: 2_020_000, rate: 0.24 },
  { upToCents: 3_520_000, rate: 0.30 },
  { upToCents: 6_000_000, rate: 0.37 },
  { upToCents: 30_000_000, rate: 0.45 },
  { upToCents: null, rate: 0.47 },
];

export const SOCIAL_SECURITY_RATE = 0.0635;
export const DEFAULT_PERSONAL_ALLOWANCE_CENTS = 555_000;

function progressiveTax(taxableCents: Cents, brackets: IrpfBracket[]): Cents {
  let tax = 0;
  let previous = 0;
  for (const bracket of brackets) {
    const ceiling = bracket.upToCents ?? taxableCents;
    if (taxableCents <= previous) break;
    const slice = Math.min(taxableCents, ceiling) - previous;
    if (slice > 0) tax += slice * bracket.rate;
    previous = ceiling;
    if (bracket.upToCents === null) break;
  }
  return Math.round(tax);
}

export function calculateSpainIrpf(input: SpainIrpfInput): SpainIrpfResult {
  if (input.grossAnnualCents <= 0) throw new Error("Gross income must be positive");
  if (input.withheldCents < 0) throw new Error("Withheld tax cannot be negative");
  const allowance = input.personalAllowanceCents ?? DEFAULT_PERSONAL_ALLOWANCE_CENTS;
  if (allowance < 0) throw new Error("Personal allowance cannot be negative");
  const taxable = Math.max(0, input.grossAnnualCents - allowance);
  const incomeTax = progressiveTax(taxable, IRPF_2026_BRACKETS);
  const socialSecurity = Math.round(input.grossAnnualCents * SOCIAL_SECURITY_RATE);
  const net = input.grossAnnualCents - incomeTax - socialSecurity;
  return {
    grossAnnualCents: input.grossAnnualCents,
    taxableIncomeCents: taxable,
    incomeTaxCents: incomeTax,
    socialSecurityCents: socialSecurity,
    netAnnualCents: net,
    refundOrOwedCents: input.withheldCents - incomeTax,
    effectiveRate: incomeTax / input.grossAnnualCents,
  };
}

export function netMonthlyCents(result: SpainIrpfResult): Cents {
  return Math.round(result.netAnnualCents / 12);
}
