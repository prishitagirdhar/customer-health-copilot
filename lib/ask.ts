import { predictForAccount } from "./churn";
import type { EnrichedAccount } from "./data";
import type { Feedback, Plan, RiskLevel } from "./types";
import { SEGMENTS, strategyFor, type SegmentKey } from "./strategy";
import { fmt } from "./ui";

/**
 * Rule-based question answering over the portfolio. No AI and no external API:
 * the question is matched against keywords and turned into filters + a sort order.
 */
export interface AskRow {
  e: EnrichedAccount;
  segment: SegmentKey;
  churn: number; // 0-1, from the offline-trained logistic regression
  priority: number;
}

export interface AskResult {
  understood: string[]; // what the parser picked up, shown to the user
  headline: string;
  rows: AskRow[]; // top N
  matched: number;
  recognised: boolean; // false when nothing in the question mapped to a rule
  accountsQuery: string; // query string for /accounts with the matching filters
}

type Sort = "priority" | "churn" | "value" | "renewal" | "health";

const SEGMENT_WORDS: [RegExp, SegmentKey][] = [
  [/onboard/, "onboard"],
  [/rescue/, "rescue"],
  [/secure[- ]renewal/, "secure-renewal"],
  [/re-?engage/, "reengage"],
  [/expan(d|sion)|upsell/, "expand"],
  [/advocate|nurture/, "advocate"],
];

export const EXAMPLES = [
  "High risk accounts renewing in the next 60 days",
  "Top 5 Enterprise accounts most likely to churn",
  "Which healthy accounts could we expand?",
  "Largest accounts in India at risk",
  "How many Starter accounts are in rescue?",
];

export function answerQuestion(
  question: string,
  accounts: EnrichedAccount[],
  feedback: Pick<Feedback, "account_id" | "score">[]
): AskResult {
  const q = question.toLowerCase();
  const understood: string[] = [];
  let recognised = false;
  const note = (s: string) => {
    understood.push(s);
    recognised = true;
  };

  // --- parse the question into filters ---
  let risk: RiskLevel | "" = "";
  if (/high[- ]risk|at[- ]risk|\brisky\b|critical/.test(q)) risk = "High";
  else if (/medium[- ]risk|\bmedium\b/.test(q)) risk = "Medium";
  else if (/healthy|low[- ]risk/.test(q)) risk = "Low";
  if (risk) note(`${risk} risk`);

  const plan = (["Starter", "Growth", "Enterprise"] as Plan[]).find((p) => q.includes(p.toLowerCase())) ?? "";
  if (plan) note(`${plan} plan`);

  const region = /\bindia\b/.test(q) ? "India" : /\b(us|usa)\b/.test(q) ? "US" : "";
  if (region) note(`Region ${region}`);

  const csm =
    Array.from(new Set(accounts.map((e) => e.account.csm))).find(
      (n) => q.includes(n.toLowerCase()) || q.includes(n.split(" ")[0].toLowerCase())
    ) ?? "";
  if (csm) note(`CSM ${csm}`);

  const segment = SEGMENT_WORDS.find(([re]) => re.test(q))?.[1] ?? "";
  if (segment) note(`Segment: ${SEGMENTS[segment].label}`);

  let windowDays: number | null = null;
  const m = q.match(/(?:next|within|in)\s+(\d+)\s+days?/);
  if (m) windowDays = parseInt(m[1], 10);
  else if (/this week|next week/.test(q)) windowDays = 7;
  else if (/this month|next month/.test(q)) windowDays = 30;
  else if (/this quarter|next quarter/.test(q)) windowDays = 90;
  if (windowDays !== null) note(`Renewing within ${windowDays} days`);

  // A named account overrides the other filters
  const named = accounts.find((e) => q.includes(e.account.name.toLowerCase()));
  if (named) note(`Account ${named.account.name}`);

  const topMatch = q.match(/top\s+(\d+)/);
  const limit = Math.min(topMatch ? parseInt(topMatch[1], 10) : 10, 50);

  let sort: Sort = "priority";
  if (/churn|likely to leave|probab|lose|losing/.test(q)) sort = "churn";
  else if (/largest|biggest|value|arr|revenue/.test(q)) sort = "value";
  else if (/soon|urgent|renew/.test(q)) sort = "renewal";
  else if (/worst|lowest|health/.test(q)) sort = "health";
  if (sort !== "priority") note(`Sorted by ${sort === "churn" ? "churn probability" : sort === "value" ? "contract value" : sort === "renewal" ? "renewal date" : "health score"}`);

  // --- apply ---
  const fbBy = new Map<string, Pick<Feedback, "score">[]>();
  feedback.forEach((f) => fbBy.set(f.account_id, [...(fbBy.get(f.account_id) ?? []), f]));

  const all: AskRow[] = accounts.map((e) => {
    const s = strategyFor(e);
    return { e, segment: s.segment, priority: s.priority, churn: predictForAccount(e, fbBy.get(e.account.id) ?? []).probability };
  });

  const matches = named
    ? all.filter((r) => r.e.account.id === named.account.id)
    : all.filter(
        ({ e, segment: seg }) =>
          (!risk || e.health.risk === risk) &&
          (!plan || e.account.plan === plan) &&
          (!region || e.account.region === region) &&
          (!csm || e.account.csm === csm) &&
          (!segment || seg === segment) &&
          (windowDays === null || (e.daysToRenewal >= 0 && e.daysToRenewal <= windowDays))
      );

  const key: Record<Sort, (r: AskRow) => number> = {
    priority: (r) => -r.priority,
    churn: (r) => -r.churn,
    value: (r) => -r.e.account.contract_value,
    renewal: (r) => r.e.daysToRenewal,
    health: (r) => r.e.health.score,
  };
  const sorted = [...matches].sort((a, b) => key[sort](a) - key[sort](b));

  const totalValue = matches.reduce((s, r) => s + r.e.account.contract_value, 0);
  const avgChurn = matches.length ? matches.reduce((s, r) => s + r.churn, 0) / matches.length : 0;
  const headline = matches.length
    ? `${matches.length} account${matches.length === 1 ? "" : "s"} match · ${fmt(totalValue)} contract value · average churn probability ${Math.round(avgChurn * 100)}%`
    : "No accounts match that question.";

  const p = new URLSearchParams();
  if (risk) p.set("risk", risk);
  if (plan) p.set("plan", plan);
  if (region) p.set("region", region);
  if (csm) p.set("csm", csm);
  if (segment) p.set("segment", segment);

  return { understood, headline, rows: sorted.slice(0, limit), matched: matches.length, recognised, accountsQuery: p.toString() };
}
