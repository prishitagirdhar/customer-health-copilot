import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import { loadEnriched } from "@/lib/data";
import { applyFilters, parseFilters, type SearchParams } from "@/lib/filters";
import { portfolioStrategy, strategyFor } from "@/lib/strategy";
import { SEG_COLOR, fmt } from "@/lib/ui";

export const dynamic = "force-dynamic";

const DRIVER_LABEL: Record<string, string> = {
  adoption: "Low seat adoption",
  usage: "Falling usage",
  tickets: "Support ticket load",
  nps: "Low NPS",
};

function BarList({ items, color }: { items: [string, number][]; color: string }) {
  const max = Math.max(...items.map((i) => i[1]), 1);
  return (
    <div>
      {items.map(([k, v]) => (
        <div className="hbar" key={k}>
          <span className="hl">{k}</span>
          <div className="ht"><div style={{ width: `${(v / max) * 100}%`, background: color }} /></div>
          <span className="hv">{v}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const { raw, accounts: allAccounts, feedback: allFeedback } = loadEnriched();
  const csms = Array.from(new Set(allAccounts.map((e) => e.account.csm))).sort();
  const filters = parseFilters(searchParams, csms);

  // Filter once up front so every KPI, chart, segment card and table inherits it.
  const accounts = applyFilters(allAccounts, filters);
  const ids = new Set(accounts.map((e) => e.account.id));
  const feedback = allFeedback.filter((f) => ids.has(f.account_id));
  const total = accounts.length;

  const counts = { High: 0, Medium: 0, Low: 0 };
  accounts.forEach((e) => counts[e.health.risk]++);

  const totalValue = accounts.reduce((s, e) => s + e.account.contract_value, 0);
  const arrAtRisk = accounts
    .filter((e) => e.health.risk === "High")
    .reduce((s, e) => s + e.account.contract_value, 0);

  const renewalsAtRisk = accounts
    .filter((e) => e.health.risk === "High" && e.daysToRenewal >= 0 && e.daysToRenewal <= 90)
    .sort((a, b) => a.daysToRenewal - b.daysToRenewal);
  const renewalsValue = renewalsAtRisk.reduce((s, e) => s + e.renewal.amount, 0);

  const drivers: Record<string, number> = {};
  accounts
    .filter((e) => e.health.risk !== "Low")
    .forEach((e) => (drivers[e.health.driver] = (drivers[e.health.driver] ?? 0) + 1));

  const themes: Record<string, number> = {};
  feedback
    .filter((f) => f.sentiment === "negative")
    .forEach((f) => f.themes.forEach((t) => (themes[t] = (themes[t] ?? 0) + 1)));

  const top = (obj: Record<string, number>, n = 5): [string, number][] =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

  const n = Math.max(total, 1); // avoid divide-by-zero when filters match nothing
  const avgScore = Math.round(accounts.reduce((s, e) => s + e.health.score, 0) / n);
  const hp = (counts.High / n) * 100;
  const mp = hp + (counts.Medium / n) * 100;
  const donut = `conic-gradient(var(--high) 0 ${hp}%, var(--med) ${hp}% ${mp}%, var(--low) ${mp}% 100%)`;

  const segmentRows = portfolioStrategy(accounts);
  const focus = accounts
    .map((e) => ({ e, s: strategyFor(e) }))
    .sort((a, b) => b.s.priority - a.s.priority)
    .slice(0, 10);

  const kpis = [
    { label: "Accounts", value: String(total), note: `${fmt(totalValue)} contract value`, tone: "" },
    { label: "Avg health score", value: String(avgScore), note: `${counts.Low} healthy accounts`, tone: avgScore >= 70 ? "t-low" : "t-med" },
    { label: "High-risk accounts", value: String(counts.High), note: `${Math.round((counts.High / n) * 100)}% of portfolio`, tone: "t-high" },
    { label: "Contract value at risk", value: fmt(arrAtRisk), note: `${Math.round((arrAtRisk / Math.max(totalValue, 1)) * 100)}% of total value`, tone: "t-high" },
    { label: "At-risk renewals (90d)", value: String(renewalsAtRisk.length), note: `${fmt(renewalsValue)} up for renewal`, tone: "t-med" },
  ];

  return (
    <main>
      <section className="hero">
        <div>
          <h1>Portfolio overview</h1>
          <p className="sub">Account health, renewals and recommended CRM strategy for the customer success team.</p>
        </div>
        <span className="sim">Simulated data · generated {raw.generated_at.slice(0, 10)}</span>
      </section>

      <FilterBar filters={filters} csms={csms} shown={total} total={allAccounts.length} />

      {total === 0 && (
        <div className="card empty">No accounts match these filters. Try clearing one.</div>
      )}

      <div className="grid kpis">
        {kpis.map((k) => (
          <div className={`card kpi ${k.tone}`} key={k.label}>
            <div className="label">{k.label}</div>
            <div className="value">{k.value}</div>
            <div className="note">{k.note}</div>
          </div>
        ))}
      </div>

      <div className="grid three">
        <div className="card">
          <h2>Health distribution</h2>
          <div className="donut-wrap">
            <div className="donut" style={{ background: donut }}>
              <div className="hole"><b>{avgScore}</b><span>avg score</span></div>
            </div>
            <div className="legend-col">
              <div><i className="dot" style={{ background: "var(--high)" }} />High risk<b>{counts.High}</b></div>
              <div><i className="dot" style={{ background: "var(--med)" }} />Medium risk<b>{counts.Medium}</b></div>
              <div><i className="dot" style={{ background: "var(--low)" }} />Healthy<b>{counts.Low}</b></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Top churn drivers</h2>
          <p className="hint">Main cause of risk across non-healthy accounts</p>
          <BarList items={top(drivers).map(([k, v]) => [DRIVER_LABEL[k] ?? k, v])} color="var(--high)" />
        </div>

        <div className="card">
          <h2>Voice of the customer</h2>
          <p className="hint">Themes in negative feedback</p>
          <BarList items={top(themes, 5)} color="var(--brand)" />
        </div>
      </div>

      <div className="card section">
        <div className="section-head"><h2>CRM strategy by segment</h2></div>
        <p className="hint">
          Each account sits in one lifecycle segment with its own objective and cadence. The time
          share suggests where CSM effort should go, based on risk, renewal urgency and contract value.
        </p>
        <div className="segs">
          {segmentRows.map((r) => (
            <div className="seg" key={r.key} style={{ borderTopColor: SEG_COLOR[r.key] }}>
              <div className="seg-head">
                <span className="seg-name" style={{ color: SEG_COLOR[r.key] }}>{r.label}</span>
                <span className="seg-share">{r.timeShare}% of CSM time</span>
              </div>
              <div className="seg-nums"><strong>{r.count}</strong> accounts · {fmt(r.value)}</div>
              <p className="seg-obj">{r.objective}</p>
              <div className="seg-cad">{r.cadence}</div>
              <div className="meter"><div style={{ width: `${r.timeShare}%`, background: SEG_COLOR[r.key] }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card section">
        <div className="section-head"><h2>Focus list this week</h2></div>
        <p className="hint">Top 10 accounts to act on, ranked by health gap, renewal urgency and contract value.</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Account</th><th>Segment</th><th>Priority</th><th>Next best action</th><th>Cadence</th></tr>
            </thead>
            <tbody>
              {focus.map(({ e, s }) => (
                <tr key={e.account.id}>
                  <td><Link href={`/accounts/${e.account.id}`}><strong>{e.account.name}</strong></Link></td>
                  <td>
                    <span className="chip" style={{ background: `${SEG_COLOR[s.segment]}1a`, color: SEG_COLOR[s.segment] }}>
                      {s.label}
                    </span>
                  </td>
                  <td>
                    <div className="prio">
                      <div className="meter"><div style={{ width: `${s.priority}%`, background: SEG_COLOR[s.segment] }} /></div>
                      <strong>{s.priority}</strong>
                    </div>
                  </td>
                  <td>{s.actions[0]}</td>
                  <td>{s.cadence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card section">
        <div className="section-head"><h2>At-risk renewals in the next 90 days</h2></div>
        <p className="hint">High-risk accounts with a renewal date inside 90 days.</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Account</th><th>CSM</th><th>Renewal</th><th>Value</th><th>Score</th><th>Why at risk</th></tr>
            </thead>
            <tbody>
              {renewalsAtRisk.slice(0, 12).map((e) => (
                <tr key={e.account.id}>
                  <td><Link href={`/accounts/${e.account.id}`}><strong>{e.account.name}</strong></Link></td>
                  <td>{e.account.csm}</td>
                  <td>{e.renewal.renewal_date} ({e.daysToRenewal}d)</td>
                  <td>{fmt(e.renewal.amount)}</td>
                  <td><span className={`pill ${e.health.risk}`}>{e.health.score}</span></td>
                  <td>{e.health.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
