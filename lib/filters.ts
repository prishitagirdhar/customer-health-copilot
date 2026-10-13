import type { EnrichedAccount } from "./data";
import type { Plan, RiskLevel } from "./types";

/** Dashboard filters, stored in the URL so any view is shareable. "" means All. */
export interface Filters {
  csm: string;
  plan: Plan | "";
  region: "US" | "India" | "";
  risk: RiskLevel | "";
}

export const PLANS: Plan[] = ["Starter", "Growth", "Enterprise"];
export const REGIONS = ["US", "India"] as const;
export const RISKS: RiskLevel[] = ["High", "Medium", "Low"];

export type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Reads filters from search params; unknown values fall back to All. */
export function parseFilters(sp: SearchParams, csms: string[]): Filters {
  const csm = one(sp.csm);
  const plan = one(sp.plan);
  const region = one(sp.region);
  const risk = one(sp.risk);
  return {
    csm: csms.includes(csm) ? csm : "",
    plan: PLANS.includes(plan as Plan) ? (plan as Plan) : "",
    region: (REGIONS as readonly string[]).includes(region) ? (region as Filters["region"]) : "",
    risk: RISKS.includes(risk as RiskLevel) ? (risk as RiskLevel) : "",
  };
}

export function applyFilters(accounts: EnrichedAccount[], f: Filters): EnrichedAccount[] {
  return accounts.filter(
    (e) =>
      (!f.csm || e.account.csm === f.csm) &&
      (!f.plan || e.account.plan === f.plan) &&
      (!f.region || e.account.region === f.region) &&
      (!f.risk || e.health.risk === f.risk)
  );
}

export const hasFilters = (f: Filters) => Object.values(f).some(Boolean);
