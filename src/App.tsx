import { useMemo, useState } from "react";
import { formatNZD, processPayRun, type PayRun } from "./payroll.js";
import { employees, inputs, PERIOD_LABEL } from "./seed.js";

const nzd = (cents: number) => formatNZD(cents);

export function App() {
  const [approved, setApproved] = useState(false);
  const [showAnomalies, setShowAnomalies] = useState(true);

  const payRun: PayRun = useMemo(
    () => processPayRun(employees, inputs, PERIOD_LABEL),
    [],
  );

  return (
    <div className="shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">Payroll operations</p>
          <h1>One pay run. Every deduction accounted for.</h1>
          <p className="lede">
            PAYE, ACC, KiwiSaver, ESCT, student loan and employer cost calculated
            from the same employee and pay-run state.
          </p>
        </div>
        <div className="mast-actions">
          <span className={approved ? "status approved" : "status"}>
            {approved ? "Pay run approved" : "Draft pay run"}
          </span>
          <button className="primary" onClick={() => setApproved(true)}>
            Approve pay run
          </button>
        </div>
      </header>

      <section className="metrics" aria-label="Pay run totals">
        <Metric label="Gross pay" value={nzd(payRun.totals.grossCents)} />
        <Metric label="PAYE" value={nzd(payRun.totals.payeCents)} />
        <Metric label="KiwiSaver" value={nzd(payRun.totals.employeeKiwiSaverCents)} />
        <Metric label="Net pay" value={nzd(payRun.totals.netCents)} tone="primary" />
        <Metric label="Employer cost" value={nzd(payRun.totals.employerCostCents)} tone="dark" />
      </section>

      <main className="grid">
        <section className="panel pay-run">
          <div className="panel-head">
            <div>
              <h2>{payRun.periodLabel}</h2>
              <p>{payRun.lines.length} employees · weekly, fortnightly and monthly</p>
            </div>
            <span className="pill">NZD · cents</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th className="num">Gross</th>
                  <th className="num">PAYE</th>
                  <th className="num">ACC</th>
                  <th className="num">KiwiSaver</th>
                  <th className="num">Student loan</th>
                  <th className="num">Net</th>
                </tr>
              </thead>
              <tbody>
                {payRun.lines.map((line) => (
                  <tr key={line.employeeId}>
                    <td>
                      <strong>{line.name}</strong>
                      <small>{line.frequency} · {payRun.lines.length > 0 ? employees.find((e) => e.id === line.employeeId)?.taxCode : ""}</small>
                    </td>
                    <td className="num">{nzd(line.grossCents)}</td>
                    <td className="num">{nzd(line.payeCents)}</td>
                    <td className="num">{nzd(line.accCents)}</td>
                    <td className="num">{nzd(line.employeeKiwiSaverCents)}</td>
                    <td className="num">{nzd(line.studentLoanCents)}</td>
                    <td className="num strong">{nzd(line.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel breakdown">
          <div className="panel-head">
            <h2>Employer cost</h2>
          </div>
          <dl>
            <div><dt>Gross pay</dt><dd>{nzd(payRun.totals.grossCents)}</dd></div>
            <div><dt>Employer KiwiSaver</dt><dd>{nzd(payRun.totals.employerKiwiSaverCents)}</dd></div>
            <div><dt>ESCT</dt><dd>{nzd(payRun.totals.esctCents)}</dd></div>
            <div className="total"><dt>Total cost</dt><dd>{nzd(payRun.totals.employerCostCents)}</dd></div>
          </dl>
          <div className="callout">
            <strong>Check before approval</strong>
            <p>
              PAYE uses annualised progressive brackets; ACC is capped at the
              annual earner levy threshold; student loan applies only above the
              annual threshold.
            </p>
          </div>
        </aside>

        <section className="panel anomalies">
          <div className="panel-head">
            <h2>Pay-run checks</h2>
            <button className="ghost" onClick={() => setShowAnomalies((value) => !value)}>
              {showAnomalies ? "Hide" : "Show"}
            </button>
          </div>
          {showAnomalies ? (
            <ul>
              {payRun.anomalies.length === 0 ? (
                <li className="ok">No anomalies. This run is clear to approve.</li>
              ) : (
                payRun.anomalies.map((anomaly) => <li key={anomaly}>{anomaly}</li>)
              )}
            </ul>
          ) : null}
        </section>

        <section className="panel notes">
          <div className="panel-head">
            <h2>How the engine works</h2>
          </div>
          <div className="note-grid">
            <Note title="Gross" body="Base period pay + overtime at 1.5× + taxable allowances + bonus − unpaid leave." />
            <Note title="PAYE" body="Progressive 10.5% → 39% brackets applied to annualised gross, then divided by the pay frequency." />
            <Note title="KiwiSaver + ESCT" body="Employee and employer contributions, with ESCT selected from annualised gross." />
            <Note title="Net + employer cost" body="Net is gross less PAYE, ACC, employee KiwiSaver and student loan; employer cost adds employer KiwiSaver." />
          </div>
        </section>
      </main>

      <footer>
        <span>TypeScript · React · Vite · Vitest</span>
        <span>Reference implementation for Smartly payroll workflows</span>
      </footer>
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" | "dark" }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <div className="note">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
