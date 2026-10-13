import type { EnrichedAccount } from "./data";
import type { Account, HealthResult, Plan } from "./types";

/**
 * CRM strategy engine (rule-based, no external API).
 * Places every account in a lifecycle segment and recommends the objective,
 * touch cadence, channel, next best actions and talking points for the CSM.
 */
export type SegmentKey =
  | "onboard"
  | "rescue"
  | "secure-renewal"
  | "reengage"
  | "expand"
  | "advocate";

export const SEGMENTS: Record<SegmentKey, { label: string; objective: string; successMetric: string }> = {
  onboard: {
    label: "Onboard & Activate",
    objective: "Get the customer live and booking within 60 days of signing",
    successMetric: "Go-live reached; 50%+ of seats active within 30 days of go-live",
  },
  rescue: {
    label: "Rescue (high risk)",
    objective: "Stabilise the account and remove the main churn driver before renewal",
    successMetric: "Health score above 50 within 45 days and renewal conversation opened",
  },
  "secure-renewal": {
    label: "Secure Renewal",
    objective: "Lock in the renewal early and prepare a clean handoff to Sales",
    successMetric: "Renewal signed at least 30 days before term end",
  },
  reengage: {
    label: "Re-engage & Adopt",
    objective: "Lift adoption and usage before the account slides into high risk",
    successMetric: "Seat adoption up 10 points in 60 days",
  },
  expand: {
    label: "Expand",
    objective: "Grow revenue through more seats, new modules or new teams",
    successMetric: "Upsell opportunity created and qualified with Sales",
  },
  advocate: {
    label: "Nurture & Advocate",
    objective: "Keep healthy customers happy and turn the best ones into references",
    successMetric: "NPS held steady; one case study or referral per quarter from top accounts",
  },
};

const CADENCE: Record<SegmentKey, Record<Plan, string>> = {
  onboard: {
    Enterprise: "Weekly working session with a shared project plan",
    Growth: "Weekly check-in until go-live",
    Starter: "Guided setup emails plus two group training sessions",
  },
  rescue: {
    Enterprise: "Weekly call plus executive sponsor outreach",
    Growth: "Weekly call until the score recovers",
    Starter: "Call within 48 hours, then every two weeks",
  },
  "secure-renewal": {
    Enterprise: "Every two weeks, with a business review 90 days out",
    Growth: "Every two weeks until signed",
    Starter: "Renewal email series plus one call",
  },
  reengage: {
    Enterprise: "Every two weeks with adoption reviews",
    Growth: "Every two weeks plus a targeted usage campaign",
    Starter: "Monthly digital campaign plus one training webinar",
  },
  expand: {
    Enterprise: "Monthly, with an expansion plan in the quarterly review",
    Growth: "Monthly check-in",
    Starter: "Quarterly check-in plus in-app prompts",
  },
  advocate: {
    Enterprise: "Quarterly business review plus an executive briefing",
    Growth: "Quarterly check-in",
    Starter: "Digital touch: newsletter and NPS pulse",
  },
};

const ESCALATION: Record<SegmentKey, string> = {
  onboard: "Implementation or Engineering if blocked for 10+ days",
  rescue: "CS lead and the account executive; executive sponsor for Enterprise",
  "secure-renewal": "Account executive owns commercials, CSM owns the value story",
  reengage: "CSM; escalate to CS lead if the score drops below 50",
  expand: "Account executive for the upsell opportunity",
  advocate: "None unless the score drops",
};

export interface Strategy {
  segment: SegmentKey;
  label: string;
  objective: string;
  cadence: string;
  channel: string;
  actions: string[];
  talkingPoints: string[];
  successMetric: string;
  escalation: string;
  priority: number; // 0-100, higher = act sooner
}

export function pickSegment(a: Account, h: HealthResult, daysToRenewal: number): SegmentKey {
  if (a.onboarding_stage !== "Live") return "onboard";
  if (h.risk === "High") return "rescue";
  if (daysToRenewal >= 0 && daysToRenewal <= 120) return "secure-renewal";
  if (h.risk === "Medium") return "reengage";
  if (h.parts.adoption >= 85) return "expand";
  return "advocate";
}

function channelFor(plan: Plan) {
  if (plan === "Starter") return "Email and in-app messages (digital-led)";
  if (plan === "Growth") return "Video call and email";
  return "Video call, executive sponsor and a shared channel";
}

function actionsFor(seg: SegmentKey, a: Account, h: HealthResult, days: number): string[] {
  const adopt = Math.round(h.parts.adoption);
  switch (seg) {
    case "onboard":
      return [
        `Confirm the go-live date and a customer-side owner (currently at ${a.onboarding_stage})`,
        "Finish platform configuration: approval policies, user import, integrations",
        "Run role-based training for admins and first travellers",
        "Set up usage tracking and a day-30 adoption check",
      ];
    case "rescue":
      return [
        `Address the main driver first: ${h.reason}`,
        "Hold a root-cause call with the admin and escalate open tickets",
        `Share a dated recovery plan and bring in the AE, since renewal is in ${days} days`,
        "Log the customer's feedback and send blockers to Product",
      ];
    case "secure-renewal":
      return [
        `Open the renewal conversation now (${days} days left)`,
        "Prepare an ROI summary covering bookings, savings and adoption",
        "Confirm decision-makers and any contract changes",
        h.risk === "Medium"
          ? `Fix the main driver before the call: ${h.reason}`
          : "Hand off to Sales with a short account summary",
      ];
    case "reengage":
      return [
        `Target the weak spot: ${h.reason}`,
        "Run a feature-adoption campaign for inactive users",
        "Schedule a refresher session for admins and approvers",
        "Re-check the health score in 30 days",
      ];
    case "expand":
      return [
        `Adoption is ${adopt}%: propose more seats or the Cards module`,
        "Find teams or regions not yet on the platform",
        "Share a success story from a similar customer",
        "Create the upsell opportunity with Sales",
      ];
    case "advocate":
      return [
        "Send a monthly usage summary with tips",
        "Invite them to customer advisory and feedback sessions",
        "Ask for a review or referral if NPS is 50 or higher",
        "Watch usage trend and tickets for early warning signs",
      ];
  }
}

function talkingPointsFor(seg: SegmentKey, h: HealthResult, days: number): string[] {
  switch (seg) {
    case "onboard":
      return [
        "Our goal is first bookings in the first 30 days.",
        "What could slow down the rollout on your side?",
      ];
    case "rescue":
      return [
        `We noticed this: ${h.reason}. Here is our plan to fix it.`,
        "Here is who owns each step and the date we will report back.",
      ];
    case "secure-renewal":
      return [
        `Your renewal is in ${days} days, so let us review the value you have seen so far.`,
        "What would you like to change or add for next year?",
      ];
    case "reengage":
      return [
        "We want your team to get more from the platform; where do people get stuck?",
        "A short refresher for approvers usually lifts usage quickly.",
      ];
    case "expand":
      return [
        "Your teams are using the platform well; which groups are not yet on it?",
        "Here is how a similar customer added value with more seats.",
      ];
    case "advocate":
      return [
        "Thanks for the strong adoption; what is working best for you?",
        "Would you be open to sharing your experience with other customers?",
      ];
  }
}

export function strategyFor(e: EnrichedAccount): Strategy {
  const { account: a, health: h, daysToRenewal: days } = e;
  const segment = pickSegment(a, h, days);
  const info = SEGMENTS[segment];

  const urgency = days <= 30 ? 30 : days <= 90 ? 20 : days <= 180 ? 10 : 0;
  const valueScore = Math.min(20, a.contract_value / 10000);
  const need = (100 - h.score) * 0.5;
  const priority = Math.round(Math.max(0, Math.min(100, need + urgency + valueScore)));

  return {
    segment,
    label: info.label,
    objective: info.objective,
    cadence: CADENCE[segment][a.plan],
    channel: channelFor(a.plan),
    actions: actionsFor(segment, a, h, days),
    talkingPoints: talkingPointsFor(segment, h, days),
    successMetric: info.successMetric,
    escalation: ESCALATION[segment],
    priority,
  };
}

export interface SegmentSummary {
  key: SegmentKey;
  label: string;
  objective: string;
  cadence: string; // typical (Growth plan)
  count: number;
  value: number;
  timeShare: number; // suggested % of CSM time
}

/** Portfolio view: how many accounts per segment and where CSM time should go. */
export function portfolioStrategy(accounts: EnrichedAccount[]): SegmentSummary[] {
  const keys = Object.keys(SEGMENTS) as SegmentKey[];
  const acc = Object.fromEntries(
    keys.map((k) => [k, { count: 0, value: 0, priority: 0 }])
  ) as Record<SegmentKey, { count: number; value: number; priority: number }>;

  accounts.forEach((e) => {
    const s = strategyFor(e);
    acc[s.segment].count++;
    acc[s.segment].value += e.account.contract_value;
    acc[s.segment].priority += s.priority;
  });

  const totalPriority = keys.reduce((sum, k) => sum + acc[k].priority, 0) || 1;
  return keys
    .map((k) => ({
      key: k,
      label: SEGMENTS[k].label,
      objective: SEGMENTS[k].objective,
      cadence: CADENCE[k].Growth,
      count: acc[k].count,
      value: acc[k].value,
      timeShare: Math.round((acc[k].priority / totalPriority) * 100),
    }))
    .sort((a, b) => b.timeShare - a.timeShare);
}
