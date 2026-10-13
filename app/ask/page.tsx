import Link from "next/link";
import { answerQuestion, EXAMPLES } from "@/lib/ask";
import { loadEnriched } from "@/lib/data";
import { SEGMENTS } from "@/lib/strategy";
import { SEG_COLOR, fmt } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default function AskPage({ searchParams }: { searchParams: { q?: string } }) {
  const question = (searchParams.q ?? "").trim().slice(0, 200);
  const { accounts, feedback } = loadEnriched();
  const result = question ? answerQuestion(question, accounts, feedback) : null;

  return (
    <main>
      <section className="hero">
        <div>
          <h1>Ask Copilot</h1>
          <p className="sub">Ask about the portfolio in plain English. Answers come from fixed keyword rules over the data, not from an AI model.</p>
        </div>
        <span className="sim">Simulated data</span>
      </section>

      <form className="card ask-form" action="/ask" role="search">
        <label className="filter" style={{ flex: 1 }}>
          <span>Your question</span>
          <input type="search" name="q" defaultValue={question} placeholder="e.g. High risk accounts renewing in the next 60 days" maxLength={200} />
        </label>
        <button type="submit" className="btn">Ask</button>
      </form>

      <div className="chips" aria-label="Example questions">
        {EXAMPLES.map((ex) => (
          <Link key={ex} className="fchip" href={`/ask?q=${encodeURIComponent(ex)}`}>{ex}</Link>
        ))}
      </div>

      {result && (
        <div className="card section" aria-live="polite">
          <h2>{result.headline}</h2>
          {result.recognised ? (
            <p className="hint">Understood as: {result.understood.join(" · ")}</p>
          ) : (
            <p className="banner">
              I did not recognise any filters in that question, so this shows the top accounts by priority. Try
              mentioning a risk level, plan, region, CSM, segment or a renewal window.
            </p>
          )}

          {result.rows.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Account</th><th>Health</th><th>Churn probability</th><th>Segment</th><th>Value</th><th>Renewal</th></tr>
                </thead>
                <tbody>
                  {result.rows.map(({ e, segment, churn }) => (
                    <tr key={e.account.id}>
                      <td><Link href={`/accounts/${e.account.id}`}><strong>{e.account.name}</strong></Link></td>
                      <td><span className={`pill ${e.health.risk}`}>{e.health.score}</span></td>
                      <td>{Math.round(churn * 100)}%</td>
                      <td>
                        <span className="chip" style={{ background: `${SEG_COLOR[segment]}1a`, color: SEG_COLOR[segment] }}>
                          {SEGMENTS[segment].label}
                        </span>
                      </td>
                      <td>{fmt(e.account.contract_value)}</td>
                      <td>{e.renewal.renewal_date} ({e.daysToRenewal}d)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.matched > result.rows.length && result.accountsQuery && (
            <p className="hint" style={{ marginTop: 12 }}>
              Showing {result.rows.length} of {result.matched}. <Link href={`/accounts?${result.accountsQuery}`}>See the full list in Accounts</Link>
            </p>
          )}
        </div>
      )}
    </main>
  );
}
