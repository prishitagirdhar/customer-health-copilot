import Link from "next/link";
import { notFound } from "next/navigation";
import ActivityTimeline from "@/components/ActivityTimeline";
import HealthGauge from "@/components/HealthGauge";
import QuickActions from "@/components/QuickActions";
import { predictForAccount } from "@/lib/churn";
import { FEATURE_NAMES } from "@/lib/churn-features";
import { loadEnriched, type EnrichedAccount } from "@/lib/data";
import { evaluatePlaybooks } from "@/lib/playbooks";
import { WEIGHTS } from "@/lib/scoring";
import { strategyFor, type Strategy } from "@/lib/strategy";
import type { Contact } from "@/lib/types";
import { fmt } from "@/lib/ui";

export const dynamic = "force-dynamic";

const LABEL = {
  adoption: "Seat adoption",
  usage: "Usage trend",
  tickets: "Support tickets",
  nps: "NPS",
} as const;

const FEATURE_LABEL: Record<(typeof FEATURE_NAMES)[number], string> = {
  seat_adoption: "Seat adoption",
  usage_change_pct: "Usage change",
  open_tickets: "Open tickets",
  nps: "NPS",
  plan_growth: "Growth plan",
  plan_enterprise: "Enterprise plan",
  days_to_renewal: "Renewal proximity",
  account_age_days: "Account age",
  negative_feedback_share: "Negative feedback",
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "strategy", label: "Strategy" },
  { key: "contacts", label: "Contacts" },
  { key: "activity", label: "Activity" },
  { key: "feedback", label: "Feedback" },
  { key: "tasks", label: "Tasks" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function draftEmail(e: EnrichedAccount, s: Strategy, contacts: Contact[]) {
  const to = contacts[0]?.name.split(" ")[0] ?? "there";
  return [
    `Subject: Your ${e.account.name} renewal on ${e.renewal.renewal_date}`,
    "",
    `Hi ${to},`,
    "",
    `Your renewal is coming up on ${e.renewal.renewal_date} (${e.daysToRenewal} days). I would like to set up a short call to review how things are going.`,
    "",
    `One thing I noticed: ${e.health.reason.toLowerCase()}. I would like to understand what is behind it and agree on next steps together.`,
    "",
    "Points I would like to cover:",
    ...s.talkingPoints.map((t) => `- ${t}`),
    "",
    "Do you have 30 minutes this week or next?",
    "",
    "Best regards,",
    e.account.csm,
  ].join("\n");
}

export default function AccountPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const { raw, accounts, feedback } = loadEnriched();
  const e = accounts.find((x) => x.account.id === params.id);
  if (!e) notFound();

  const a = e.account;
  const tab: TabKey = TABS.some((t) => t.key === searchParams.tab) ? (searchParams.tab as TabKey) : "overview";
  const s = strategyFor(e);
  const tasks = evaluatePlaybooks(a, e.health, e.daysToRenewal, e.daysSinceSigned);
  const contacts = raw.contacts.filter((c) => c.account_id === a.id);
  const fb = feedback.filter((f) => f.account_id === a.id);
  const acts = raw.activities
    .filter((x) => x.account_id === a.id)
    .sort((x, y) => y.occurred_on.localeCompare(x.occurred_on));
  const churn = predictForAccount(e, fb);
  const keys = Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[];

  return (
    <main>
      <Link href="/accounts" className="back">← Accounts</Link>
      <h1>{a.name}</h1>
      <div className="sub">
        {a.plan} plan · {a.industry} · {a.region} · CSM {a.csm} · Onboarding: {a.onboarding_stage}
      </div>
      <div className="banner">{raw.note}</div>

      <nav className="tabs" aria-label="Account sections">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/accounts/${a.id}?tab=${t.key}`}
            className={t.key === tab ? "active" : undefined}
            aria-current={t.key === tab ? "page" : undefined}
            scroll={false}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <>
          <div className="grid two">
            <div className="card">
              <h2>Health score</h2>
              <HealthGauge score={e.health.score} risk={e.health.risk} />
              <p className="kv"><b>Main driver:</b> {e.health.reason}</p>
            </div>
            <div className="grid kpis" style={{ marginBottom: 0 }}>
              <div className="card kpi"><div className="label">Contract value</div><div className="value">{fmt(a.contract_value)}</div></div>
              <div className="card kpi">
                <div className="label">Renewal</div>
                <div className="value" style={{ fontSize: 20 }}>{e.renewal.renewal_date}</div>
                <div className="note">in {e.daysToRenewal} days · {e.renewal.stage}</div>
              </div>
              <div className="card kpi"><div className="label">Priority</div><div className="value">{s.priority}</div></div>
              <div className="card kpi">
                <div className="label">Churn probability</div>
                <div className="value">{Math.round(churn.probability * 100)}%</div>
                <div className="note">ML model, simulated labels</div>
              </div>
            </div>
          </div>

          <div className="grid two">
            <div className="card">
              <h2>Score breakdown</h2>
              {keys.map((k) => (
                <div className="mrow" key={k}>
                  <span className="name">{LABEL[k]} ({Math.round(WEIGHTS[k] * 100)}%)</span>
                  <div className="meter"><div style={{ width: `${Math.round(e.health.parts[k])}%` }} /></div>
                  <span className="val">{Math.round(e.health.parts[k])}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <h2>What pushes churn risk up</h2>
              <ul className="list">
                {churn.drivers.length === 0 && <li>No factor raises risk above the portfolio average.</li>}
                {churn.drivers.map((d) => <li key={d.feature}>{FEATURE_LABEL[d.feature]}</li>)}
              </ul>
            </div>
          </div>

          <QuickActions emailDraft={draftEmail(e, s, contacts)} />
        </>
      )}

      {tab === "strategy" && (
        <div className="grid two">
          <div className="card">
            <h2>Recommended CRM strategy</h2>
            <p><span className="tag">{s.label}</span></p>
            <p className="kv"><b>Objective:</b> {s.objective}</p>
            <p className="kv"><b>Cadence:</b> {s.cadence}</p>
            <p className="kv"><b>Channel:</b> {s.channel}</p>
            <p className="kv"><b>Success metric:</b> {s.successMetric}</p>
            <p className="kv"><b>Escalation:</b> {s.escalation}</p>
          </div>
          <div className="card">
            <h2>Next best actions</h2>
            <ul className="list">{s.actions.map((x) => <li key={x}>{x}</li>)}</ul>
            <h2 style={{ marginTop: 16 }}>Talking points</h2>
            <ul className="list">{s.talkingPoints.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>
      )}

      {tab === "contacts" && (
        <div className="card">
          <h2>Contacts</h2>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Email</th></tr></thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}><td>{c.name}</td><td>{c.role}</td><td>{c.email}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="card">
          <h2>Recent activity</h2>
          <ActivityTimeline items={acts} />
        </div>
      )}

      {tab === "feedback" && (
        <div className="card">
          <h2>Customer feedback</h2>
          {fb.map((f) => (
            <div className="row" key={f.id} style={{ display: "block" }}>
              <div>{f.comment}</div>
              <div className="sub" style={{ margin: "4px 0 0" }}>
                {f.score}/10 · {f.sentiment}
                {f.themes.length > 0 && ` · ${f.themes.join(", ")}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "tasks" && (
        <div className="card">
          <h2>Playbook tasks triggered</h2>
          {tasks.length === 0 && <p className="kv">No playbook rules triggered.</p>}
          <ul className="list">
            {tasks.map((t) => (
              <li key={t.playbook}>
                <strong>{t.title}</strong> ({t.priority}, due in {t.due_in_days} days)
                <div className="muted">{t.description}</div>
              </li>
            ))}
          </ul>
          <p className="hint">Manage status on the <Link href="/tasks">Tasks board</Link>.</p>
        </div>
      )}
    </main>
  );
}
