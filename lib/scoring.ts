import type { Account, ComponentKey, HealthResult, RiskLevel } from "./types";

/**
 * Transparent weighted health score (0-100).
 * Every number here can be explained to a customer or a hiring manager.
 */
export const WEIGHTS: Record<ComponentKey, number> = {
  adoption: 0.35, // share of licensed seats that are active
  usage: 0.25, // booking volume trend vs previous 30 days
  tickets: 0.15, // open support tickets
  nps: 0.25, // latest account NPS
};

const KEYS = Object.keys(WEIGHTS) as ComponentKey[];
const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

export function adoptionPct(a: Pick<Account, "seats_active" | "seats_licensed">) {
  return (a.seats_active / Math.max(a.seats_licensed, 1)) * 100;
}

export function usageChangePct(
  a: Pick<Account, "bookings_last_30" | "bookings_prev_30">
) {
  return ((a.bookings_last_30 - a.bookings_prev_30) / Math.max(a.bookings_prev_30, 1)) * 100;
}

export function riskFromScore(score: number): RiskLevel {
  if (score < 50) return "High";
  if (score < 70) return "Medium";
  return "Low";
}

export function computeHealth(a: Account): HealthResult {
  const adoption = adoptionPct(a);
  const change = usageChangePct(a);

  const parts: Record<ComponentKey, number> = {
    adoption: clamp(adoption),
    usage: clamp(50 + change), // -50% -> 0, flat -> 50, +50% -> 100
    tickets: clamp(100 - a.open_tickets * 15), // 7+ open tickets -> 0
    nps: clamp((a.nps_latest + 100) / 2),
  };

  const score = Math.round(KEYS.reduce((sum, k) => sum + parts[k] * WEIGHTS[k], 0));

  // Driver = component that costs the most points (weighted shortfall)
  const driver = KEYS.reduce((worst, k) =>
    (100 - parts[k]) * WEIGHTS[k] > (100 - parts[worst]) * WEIGHTS[worst] ? k : worst
  );

  const reasons: Record<ComponentKey, string> = {
    adoption: `Only ${Math.round(adoption)}% of licensed seats are active`,
    usage: `Bookings ${change < 0 ? "fell" : "grew"} ${Math.abs(Math.round(change))}% vs the previous 30 days`,
    tickets: `${a.open_tickets} open support ticket${a.open_tickets === 1 ? "" : "s"}`,
    nps: `Latest NPS is ${a.nps_latest}`,
  };

  return { score, risk: riskFromScore(score), driver, reason: reasons[driver], parts };
}
