# smartly-payroll-engine

A TypeScript/React/Vite New Zealand payroll engine and pay-run dashboard:
progressive PAYE, ACC earner levy, KiwiSaver employee/employer contributions,
ESCT, student loan, overtime, allowances, bonuses, unpaid leave, net pay,
employer cost, pay-run totals and anomaly checks.

## Why this exists

Payroll is a state machine with money attached. A pay run has to put an employee
in the right tax code, apply the right period, annualise the right gross,
calculate PAYE progressively, cap ACC, select the right ESCT rate, deduct
student loan only above the threshold, and keep employee and employer costs
reconciled. This service makes those rules explicit and testable.

## Formulas

```text
basePeriod      = baseAnnual / periodsPerYear
overtime        = overtimeHours * hourlyRate * 1.5
gross           = basePeriod + overtime + allowances + bonus - unpaidLeave
annualGross     = gross * periodsPerYear
PAYE            = progressiveTax(annualGross, brackets) / periodsPerYear
ACC             = min(annualGross, ACC cap) * ACC rate / periodsPerYear
employeeKS      = gross * employeeKiwiSaverRate
employerKS      = gross * employerKiwiSaverRate
ESCT            = employerKS * ESCT rate(annualGross)
studentLoan     = max(0, annualGross - threshold) * 12% / periodsPerYear
net             = gross - PAYE - ACC - employeeKS - studentLoan
employerCost    = gross + employerKS
```

The default rates are configurable reference settings: PAYE 10.5%/17.5%/30%/
33%/39%, ACC 1.67% with the annual cap, KiwiSaver employer 3%, ESCT
10.5%/17.5%/30%/33%/39%, student loan 12% above the annual threshold.

## UI

The dashboard is a pay-run review screen: gross, PAYE, KiwiSaver, net pay and
employer cost; an employee-level table; an employer-cost breakdown; and a
pay-run check panel for duplicates, missing tax codes, missing inputs,
excessive overtime, zero gross and negative net.

## Run

```bash
npm install
npm run dev
# or
npm run build
npm run preview
```

## Test

```bash
npm test
npm run build
```

Vitest covers PAYE brackets, ACC capping, KiwiSaver, ESCT, student loan,
overtime, allowances, bonuses, unpaid leave, period conversion, rounding,
pay-run totals and anomaly paths.

## Design tokens

From Smartly's public site and product app:

- Heading: Bricolage Grotesque SemiBold
- Body: Onest Regular
- Primary green: `#178735`
- Ink: `#26262D`
- Surface: `#F1F1F1`
- Accent: `#FFF5AC`
- Muted: `#5E5E5E`
- Background: `#FFFFFF`
- Radius: `8px`
- Spacing unit: `8px`

## CI

```bash
npm ci
npm run build
npm test
```
