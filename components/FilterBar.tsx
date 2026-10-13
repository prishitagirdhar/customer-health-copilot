"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLANS, REGIONS, RISKS, type Filters } from "@/lib/filters";

const FIELDS: { key: keyof Filters; label: string }[] = [
  { key: "csm", label: "CSM" },
  { key: "plan", label: "Plan" },
  { key: "region", label: "Region" },
  { key: "risk", label: "Risk level" },
];

export default function FilterBar({
  filters,
  csms,
  shown,
  total,
}: {
  filters: Filters;
  csms: string[];
  shown: number;
  total: number;
}) {
  const router = useRouter();
  const options: Record<keyof Filters, readonly string[]> = {
    csm: csms,
    plan: PLANS,
    region: REGIONS,
    risk: RISKS,
  };
  const active = Object.values(filters).some(Boolean);

  function change(key: keyof Filters, value: string) {
    const params = new URLSearchParams();
    (Object.keys(filters) as (keyof Filters)[]).forEach((k) => {
      const v = k === key ? value : filters[k];
      if (v) params.set(k, v);
    });
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
  }

  return (
    <div className="filters card" role="search" aria-label="Dashboard filters">
      {FIELDS.map(({ key, label }) => (
        <label key={key} className="filter">
          <span>{label}</span>
          <select value={filters[key]} onChange={(e) => change(key, e.target.value)}>
            <option value="">All</option>
            {options[key].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
      ))}
      <div className="filter-meta">
        <span>Showing <b>{shown}</b> of {total} accounts</span>
        {active && <Link href="/" scroll={false}>Clear filters</Link>}
      </div>
    </div>
  );
}
