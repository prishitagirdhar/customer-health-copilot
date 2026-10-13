/**
 * Synthetic data generator (SIMULATED B2B SaaS travel & expense accounts).
 *   npm run seed            -> writes data/seed.json
 *   npm run seed:supabase   -> also pushes to Supabase (needs .env values)
 */
import fs from "node:fs";
import path from "node:path";
import { churnFeatures } from "../lib/churn-features";
import { computeHealth } from "../lib/scoring";
import { analyzeComment } from "../lib/sentiment";
import type {
  Account, Activity, ChurnLabel, Contact, Feedback, OnboardingStage, Plan, RawDataset, Renewal,
} from "../lib/types";

const N_ACCOUNTS = 500;

// Deterministic PRNG so everyone gets the same dataset
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
// Separate stream for churn labels so adding them leaves the accounts above unchanged
const churnRand = mulberry32(2024);
const gauss = () => Math.sqrt(-2 * Math.log(1 - churnRand())) * Math.cos(2 * Math.PI * churnRand());
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const int = (lo: number, hi: number) => Math.round(between(lo, hi));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const pad = (n: number, w = 4) => String(n).padStart(w, "0");

const PREFIX = ["Apex", "Nimbus", "Vertex", "Orbit", "Zenith", "Lumen", "Quanta", "Harbor", "Summit", "Pioneer", "Atlas", "Cobalt", "Ember", "Falcon", "Helix", "Indigo"];
const SUFFIX = ["Systems", "Labs", "Logistics", "Health", "Retail", "Analytics", "Software", "Foods", "Motors", "Capital", "Media", "Energy"];
const TAIL = ["", " Group", " Global"];
const INDUSTRIES = ["Technology", "Healthcare", "Retail", "Logistics", "Financial Services", "Manufacturing", "Media", "Energy"];
const CSMS = ["Aarav Mehta", "Diya Nair", "Rohan Iyer", "Sana Khan", "Kabir Singh"];
const FIRST = ["Maya", "Arjun", "Emma", "Liam", "Priya", "Noah", "Ishaan", "Olivia", "Zara", "Ethan", "Meera", "Lucas"];
const LAST = ["Patel", "Johnson", "Rao", "Williams", "Gupta", "Brown", "Sharma", "Davis", "Reddy", "Miller"];

const COMMENTS = {
  positive: [
    "Booking is fast and the mobile app makes expense claims painless.",
    "Support is responsive and our finance team loves the reporting.",
    "Onboarding was smooth and adoption across teams has been great.",
    "Approval workflows saved us hours every week.",
  ],
  neutral: [
    "Overall fine, but reporting could be more flexible.",
    "Good platform, though the integration with our ERP needs work.",
    "Works for most trips, pricing is a bit high for our usage.",
  ],
  negative: [
    "Approval workflow is slow and managers keep getting stuck.",
    "Refunds take too long and support keeps asking for the same documents.",
    "Reporting is confusing and we cannot export expense data for finance.",
    "Too many open tickets and slow response from support.",
    "Onboarding was rushed and our employees are not trained on booking.",
    "Pricing is too high for the value, and the mobile app keeps crashing.",
    "Integration with our accounting system is broken and nobody fixes it.",
  ],
};

type Archetype = "healthy" | "neutral" | "atrisk";
const ARCH: Record<Archetype, { adopt: [number, number]; change: [number, number]; tickets: [number, number]; nps: [number, number] }> = {
  healthy: { adopt: [0.75, 0.98], change: [-5, 25], tickets: [0, 2], nps: [30, 80] },
  neutral: { adopt: [0.5, 0.75], change: [-15, 8], tickets: [1, 4], nps: [-10, 40] },
  atrisk: { adopt: [0.15, 0.5], change: [-50, -10], tickets: [3, 8], nps: [-70, 0] },
};

/**
 * Simulated "did this account churn at its last renewal" label.
 * Driven by the model features plus a hidden factor the model never sees
 * (e.g. champion left, competitor poaching) and random noise, so a model
 * trained on it cannot simply rediscover lib/scoring.ts.
 * Different weights from the health score on purpose: renewal proximity,
 * account age, plan and negative feedback matter more here than in the score.
 */
function simulateChurn(f: ReturnType<typeof churnFeatures>): boolean {
  const hidden = 0.9 * gauss() + (churnRand() < 0.08 ? 1.6 : 0);
  const logit =
    -2.4 +
    -0.025 * (f.seat_adoption - 60) +
    -0.015 * f.usage_change_pct +
    0.2 * (f.open_tickets - 2) +
    -0.008 * f.nps +
    (f.plan_growth ? -0.2 : 0) + (f.plan_enterprise ? -0.5 : 0) +
    0.9 * (1 - Math.min(f.days_to_renewal, 365) / 365) +
    (f.account_age_days < 180 ? 0.6 : 0) +
    1.4 * f.negative_feedback_share +
    hidden;
  return churnRand() < sigmoid(logit);
}

function nextAnniversary(signed: Date): Date {
  const now = new Date();
  const d = new Date(signed);
  while (d <= now) d.setFullYear(d.getFullYear() + 1);
  return d;
}

function generate(): RawDataset {
  const accounts: Account[] = [];
  const contacts: Contact[] = [];
  const renewals: Renewal[] = [];
  const feedback: Feedback[] = [];
  const activities: Activity[] = [];
  const churn_labels: ChurnLabel[] = [];
  const usedNames = new Set<string>();

  for (let i = 1; i <= N_ACCOUNTS; i++) {
    const id = `acc_${pad(i)}`;

    let name = "";
    do { name = `${pick(PREFIX)} ${pick(SUFFIX)}${pick(TAIL)}`; } while (usedNames.has(name));
    usedNames.add(name);

    const r = rand();
    const arch: Archetype = r < 0.55 ? "healthy" : r < 0.8 ? "neutral" : "atrisk";
    const cfg = ARCH[arch];

    const plan: Plan = rand() < 0.5 ? "Starter" : rand() < 0.7 ? "Growth" : "Enterprise";
    const seats = plan === "Starter" ? int(20, 80) : plan === "Growth" ? int(80, 300) : int(300, 1500);
    const active = Math.round(seats * between(...cfg.adopt));
    const prev = Math.round(seats * between(1.5, 4));
    const last = Math.max(0, Math.round(prev * (1 + between(...cfg.change) / 100)));

    const sinceDays = int(30, 900);
    const signed = daysAgo(sinceDays);
    let stage: OnboardingStage = "Live";
    if (sinceDays < 60) stage = pick<OnboardingStage>(["Kickoff", "Configuration", "Training", "Live"]);
    else if (rand() < 0.03) stage = "Configuration"; // a few stalled onboardings

    const account: Account = {
      id, name, industry: pick(INDUSTRIES), region: rand() < 0.6 ? "US" : "India", plan,
      contract_value: Math.round((seats * between(60, 140)) / 100) * 100,
      seats_licensed: seats, seats_active: active,
      bookings_last_30: last, bookings_prev_30: prev,
      open_tickets: int(...cfg.tickets), nps_latest: int(...cfg.nps),
      csm: pick(CSMS), signed_on: iso(signed), onboarding_stage: stage,
    };
    accounts.push(account);

    // Contacts
    (["Admin", "Champion", "Finance"] as const).slice(0, int(2, 3)).forEach((role, j) => {
      const first = pick(FIRST), last = pick(LAST);
      contacts.push({
        id: `con_${pad(i)}_${j + 1}`, account_id: id, name: `${first} ${last}`, role,
        email: `${first}.${last}@${name.toLowerCase().replace(/[^a-z]/g, "")}.example`,
      });
    });

    // Renewal
    const renewalDate = nextAnniversary(signed);
    const daysTo = Math.round((renewalDate.getTime() - Date.now()) / 86400000);
    renewals.push({
      id: `ren_${pad(i)}`, account_id: id, renewal_date: iso(renewalDate),
      amount: Math.round((account.contract_value * between(0.95, 1.1)) / 100) * 100,
      stage: daysTo <= 60 && rand() < 0.4 ? "In Negotiation" : "Upcoming",
    });

    // Feedback (score correlates with account NPS)
    // nps +80 -> ~9.7, 0 -> 6.5, -70 -> ~3.7 (so healthy accounts leave mostly positive comments)
    const base = 6.5 + account.nps_latest / 25;
    const accountFeedback: Feedback[] = [];
    for (let f = 0; f < int(1, 3); f++) {
      const score = clamp(Math.round(base + between(-1.5, 1.5)), 0, 10);
      const bucket = score >= 9 ? "positive" : score >= 7 ? "neutral" : "negative";
      const item: Feedback = {
        id: `fb_${pad(i)}_${f + 1}`, account_id: id, score,
        comment: pick(COMMENTS[bucket]), created_on: iso(daysAgo(int(1, 90))),
      };
      feedback.push(item);
      accountFeedback.push(item);
    }

    churn_labels.push({
      account_id: id,
      churned: simulateChurn(
        churnFeatures({ account, daysToRenewal: daysTo, accountAgeDays: sinceDays, feedback: accountFeedback })
      ),
    });

    // Activity log
    for (let k = 0; k < int(1, 4); k++) {
      const type = pick<Activity["type"]>(["Call", "Email", "QBR", "Note"]);
      activities.push({
        id: `act_${pad(i)}_${k + 1}`, account_id: id, type,
        note: type === "QBR" ? "Quarterly business review held." : type === "Call" ? "Check-in call with admin." : type === "Email" ? "Sent product update and tips." : "Internal note on account status.",
        occurred_on: iso(daysAgo(int(1, 90))),
      });
    }
  }

  return {
    generated_at: new Date().toISOString(),
    note: "SIMULATED DATA. Not from any real company. Churn labels are simulated.",
    accounts, contacts, renewals, feedback, activities, churn_labels,
  };
}

async function pushToSupabase(data: RawDataset) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.");
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key);

  const accountRows = data.accounts.map((a) => {
    const h = computeHealth(a);
    return { ...a, health_score: h.score, risk_level: h.risk, churn_driver: h.driver };
  });
  const feedbackRows = data.feedback.map((f) => {
    const s = analyzeComment(f.comment);
    return { ...f, sentiment: s.sentiment, themes: s.themes };
  });

  const tables: [string, object[]][] = [
    ["accounts", accountRows], ["contacts", data.contacts], ["renewals", data.renewals],
    ["feedback", feedbackRows], ["activities", data.activities],
  ];
  for (const [table, rows] of tables) {
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await db.from(table).upsert(rows.slice(i, i + 200));
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    console.log(`pushed ${rows.length} rows to ${table}`);
  }
}

async function main() {
  const data = generate();
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "seed.json"), JSON.stringify(data, null, 2));
  console.log(`wrote data/seed.json: ${data.accounts.length} accounts, ${data.feedback.length} feedback, ${data.renewals.length} renewals, churn rate ${((data.churn_labels.filter((l) => l.churned).length / data.accounts.length) * 100).toFixed(1)}%`);
  if (process.argv.includes("--supabase")) await pushToSupabase(data);
}

main().catch((e) => { console.error(e); process.exit(1); });
