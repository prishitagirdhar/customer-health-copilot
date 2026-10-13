import { adoptionPct, usageChangePct } from "./scoring";
import type { Account, Feedback } from "./types";

/**
 * Feature definitions shared by the seed generator, the offline trainer
 * (ml/train_churn.py mirrors this logic) and the runtime scorer (lib/churn.ts).
 * Keep all three in sync: a feature change means re-running `npm run seed`
 * and `python ml/train_churn.py`.
 */
export const FEATURE_NAMES = [
  "seat_adoption", // % of licensed seats active (0-100)
  "usage_change_pct", // % change in bookings, last 30d vs previous 30d
  "open_tickets", // count
  "nps", // account NPS (-100..100)
  "plan_growth", // 1 if Growth plan (Starter is the baseline)
  "plan_enterprise", // 1 if Enterprise plan
  "days_to_renewal", // days until the next renewal
  "account_age_days", // days since signing
  "negative_feedback_share", // share of feedback items scored 6 or lower (0-1)
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];
export type ChurnFeatures = Record<FeatureName, number>;

/** Feedback with a score at or below this counts as negative. */
export const NEGATIVE_SCORE_MAX = 6;

export function churnFeatures(input: {
  account: Account;
  daysToRenewal: number;
  accountAgeDays: number;
  feedback: Pick<Feedback, "score">[];
}): ChurnFeatures {
  const { account: a, feedback } = input;
  const negative = feedback.filter((f) => f.score <= NEGATIVE_SCORE_MAX).length;
  return {
    seat_adoption: adoptionPct(a),
    usage_change_pct: usageChangePct(a),
    open_tickets: a.open_tickets,
    nps: a.nps_latest,
    plan_growth: a.plan === "Growth" ? 1 : 0,
    plan_enterprise: a.plan === "Enterprise" ? 1 : 0,
    days_to_renewal: input.daysToRenewal,
    account_age_days: input.accountAgeDays,
    negative_feedback_share: feedback.length ? negative / feedback.length : 0,
  };
}
