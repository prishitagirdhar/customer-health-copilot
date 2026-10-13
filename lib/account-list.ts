import type { EnrichedAccount } from "./data";
import { applyFilters, parseFilters, type Filters, type SearchParams } from "./filters";
import { SEGMENTS, strategyFor, type SegmentKey } from "./strategy";

export const PAGE_SIZE = 25;

export type SortKey = "score" | "value" | "renewal";
export type SortDir = "asc" | "desc";

export interface ListState extends Filters {
  q: string;
  segment: SegmentKey | "";
  sort: SortKey;
  dir: SortDir;
  page: number;
}

export interface Row {
  e: EnrichedAccount;
  segment: SegmentKey;
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const SORTS: SortKey[] = ["score", "value", "renewal"];

export function parseListState(sp: SearchParams, csms: string[]): ListState {
  const sort = one(sp.sort);
  const segment = one(sp.segment);
  const page = parseInt(one(sp.page), 10);
  return {
    ...parseFilters(sp, csms),
    q: one(sp.q).trim(),
    segment: segment in SEGMENTS ? (segment as SegmentKey) : "",
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : "score",
    dir: one(sp.dir) === "desc" ? "desc" : "asc",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Builds a query string from state; omits defaults so URLs stay short and shareable. */
export function toQuery(s: ListState, over: Partial<ListState> = {}): string {
  const m = { ...s, ...over };
  const p = new URLSearchParams();
  (["q", "csm", "plan", "region", "risk", "segment"] as const).forEach((k) => m[k] && p.set(k, m[k]));
  if (m.sort !== "score" || m.dir !== "asc") {
    p.set("sort", m.sort);
    p.set("dir", m.dir);
  }
  if (m.page > 1) p.set("page", String(m.page));
  return p.toString();
}

/** Filters and sorts the full list (before pagination). */
export function filterAndSort(all: EnrichedAccount[], s: ListState): Row[] {
  const q = s.q.toLowerCase();
  const rows = applyFilters(all, s)
    .filter((e) => !q || e.account.name.toLowerCase().includes(q))
    .map((e) => ({ e, segment: strategyFor(e).segment }))
    .filter((r) => !s.segment || r.segment === s.segment);

  const val = (r: Row) =>
    s.sort === "score" ? r.e.health.score : s.sort === "value" ? r.e.account.contract_value : r.e.daysToRenewal;
  const sign = s.dir === "asc" ? 1 : -1;
  return rows.sort((a, b) => sign * (val(a) - val(b)) || a.e.account.name.localeCompare(b.e.account.name));
}

const esc = (v: string | number) => {
  const t = String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export function toCsv(rows: Row[]): string {
  const head = ["Account", "CSM", "Plan", "Region", "Health score", "Risk", "Segment", "Contract value (USD)", "Renewal date", "Days to renewal"];
  const lines = rows.map(({ e, segment }) =>
    [
      e.account.name, e.account.csm, e.account.plan, e.account.region, e.health.score, e.health.risk,
      SEGMENTS[segment].label, e.account.contract_value, e.renewal.renewal_date, e.daysToRenewal,
    ].map(esc).join(",")
  );
  return [head.join(","), ...lines].join("\n");
}
