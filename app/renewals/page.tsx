import Link from "next/link";
import { loadEnriched } from "@/lib/data";
import { fmt } from "@/lib/ui";
import { RISKS } from "@/lib/filters";

export const dynamic = "force-dynamic";

const BUCKETS = [
  { label: "Next 30 days", min: 0, max: 30 },
  { label: "31 to 60 days", min: 31, max: 60 },
  { label: "61 to 90 days", min: 61, max: 90 },
  { label: "91 to 180 days", min: 91, max: 180 },
];

export default function RenewalsPage() {
  const { accounts } = loadEnriched();

  const buckets = BUCKETS.map((b) => {
    const rows = accounts
      .filter((e) => e.daysToRenewal >= b.min && e.daysToRenewal <= b.max)
      .sort((x, y) => x.daysToRenewal - y.daysToRenewal);
    return { ...b, rows, value: rows.reduce((s, e) => s + e.renewal.amount, 0) };
  });

  const inWindow = buckets.flatMap((b) => b.rows);
  const byRisk = RISKS.map((r) => ({
    risk: r,
    value: inWindow.filter((e) => e.health.risk === r).reduce((s, e) => s + e.renewal.amount, 0),
  }));
  const totalValue = byRisk.reduce((s, r) => s + r.value, 0) || 1;
  const COLOR = { High: "var(--high)", Medium: "var(--med)", Low: "var(--low)" } as const;

  return (
    <main>
      <section className="hero">
        <div>
          <h1>Renewals</h1>
          <p className="sub">Renewals in the next 180 days, grouped by how soon they land.</p>
        </div>
        <span className="sim">Simulated data</span>
      </section>

      <div className="card section">
        <h2>Renewal value by risk level</h2>
        <p className="hint">{fmt(totalValue)} across {inWindow.length} renewals in the next 180 days</p>
        <div className="stack" role="img" aria-label={byRisk.map((r) => `${r.risk} risk ${fmt(r.value)}`).join(", ")}>
          {byRisk.map((r) => (
            <div key={r.risk} style={{ width: `${(r.value / totalValue) * 100}%`, background: COLOR[r.risk] }} />
          ))}
        </div>
        <div className="stack-legend">
          {byRisk.map((r) => (
            <span key={r.risk}><i className="dot" style={{ background: COLOR[r.risk] }} />{r.risk} risk <b>{fmt(r.value)}</b></span>
          ))}
        </div>
      </div>

      <div className="grid kpis">
        {buckets.map((b) => (
          <div className="card kpi" key={b.label}>
            <div className="label">{b.label}</div>
            <div className="value">{b.rows.length}</div>
            <div className="note">{fmt(b.value)} up for renewal</div>
          </div>
        ))}
      </div>

      {buckets.map((b, i) => (
        <details className="card section" key={b.label} open={i === 0}>
          <summary><h2>{b.label} <span className="count">{b.rows.length}</span></h2></summary>
          {b.rows.length === 0 ? (
            <p className="hint">No renewals in this window.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Account</th><th>Renewal</th><th>Amount</th><th>Stage</th><th>Risk</th><th>Why</th></tr>
                </thead>
                <tbody>
                  {b.rows.map((e) => (
                    <tr key={e.account.id}>
                      <td><Link href={`/accounts/${e.account.id}`}><strong>{e.account.name}</strong></Link></td>
                      <td>{e.renewal.renewal_date} ({e.daysToRenewal}d)</td>
                      <td>{fmt(e.renewal.amount)}</td>
                      <td>{e.renewal.stage}</td>
                      <td><span className={`pill ${e.health.risk}`}>{e.health.risk} · {e.health.score}</span></td>
                      <td>{e.health.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>
      ))}
    </main>
  );
}
