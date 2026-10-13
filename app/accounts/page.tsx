import Link from "next/link";
import { loadEnriched } from "@/lib/data";
import { PAGE_SIZE, filterAndSort, parseListState, toQuery, type SortKey } from "@/lib/account-list";
import { PLANS, RISKS, type SearchParams } from "@/lib/filters";
import { SEGMENTS, type SegmentKey } from "@/lib/strategy";
import { SEG_COLOR, fmt } from "@/lib/ui";

export const dynamic = "force-dynamic";

const SORT_LABEL: Record<SortKey, string> = { score: "Health", value: "Contract value", renewal: "Days to renewal" };

export default function AccountsPage({ searchParams }: { searchParams: SearchParams }) {
  const { accounts } = loadEnriched();
  const csms = Array.from(new Set(accounts.map((e) => e.account.csm))).sort();
  const s = parseListState(searchParams, csms);

  const rows = filterAndSort(accounts, s);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(s.page, pages);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const href = (over: Parameters<typeof toQuery>[1]) => {
    const qs = toQuery(s, { page: 1, ...over });
    return qs ? `/accounts?${qs}` : "/accounts";
  };
  const sortHref = (key: SortKey) =>
    href({ sort: key, dir: s.sort === key && s.dir === "asc" ? "desc" : "asc" });
  const arrow = (key: SortKey) => (s.sort === key ? (s.dir === "asc" ? " ↑" : " ↓") : "");
  const exportQs = toQuery(s, { page: 1 });
  const anyFilter = Boolean(s.q || s.csm || s.plan || s.risk || s.segment);

  return (
    <main>
      <section className="hero">
        <div>
          <h1>Accounts</h1>
          <p className="sub">{rows.length} of {accounts.length} accounts</p>
        </div>
        <span className="sim">Simulated data</span>
      </section>

      <form className="filters card" action="/accounts" role="search">
        {s.risk && <input type="hidden" name="risk" value={s.risk} />}
        {s.segment && <input type="hidden" name="segment" value={s.segment} />}
        <input type="hidden" name="sort" value={s.sort} />
        <input type="hidden" name="dir" value={s.dir} />
        <label className="filter">
          <span>Search</span>
          <input type="search" name="q" defaultValue={s.q} placeholder="Account name" />
        </label>
        <label className="filter">
          <span>CSM</span>
          <select name="csm" defaultValue={s.csm}>
            <option value="">All</option>
            {csms.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="filter">
          <span>Plan</span>
          <select name="plan" defaultValue={s.plan}>
            <option value="">All</option>
            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <button type="submit" className="btn">Apply</button>
        <div className="filter-meta">
          {anyFilter && <Link href="/accounts">Clear filters</Link>}
          <a className="btn" href={`/api/accounts/export${exportQs ? `?${exportQs}` : ""}`}>Export CSV</a>
        </div>
      </form>

      <div className="chips" aria-label="Risk level">
        <Link className={`fchip${!s.risk ? " on" : ""}`} href={href({ risk: "" })}>All risk</Link>
        {RISKS.map((r) => (
          <Link key={r} className={`fchip${s.risk === r ? " on" : ""}`} href={href({ risk: r })}>{r}</Link>
        ))}
      </div>
      <div className="chips" aria-label="Segment">
        <Link className={`fchip${!s.segment ? " on" : ""}`} href={href({ segment: "" })}>All segments</Link>
        {(Object.keys(SEGMENTS) as SegmentKey[]).map((k) => (
          <Link key={k} className={`fchip${s.segment === k ? " on" : ""}`} href={href({ segment: k })}>
            {SEGMENTS[k].label}
          </Link>
        ))}
      </div>

      <div className="card section">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th aria-sort={s.sort === "score" ? (s.dir === "asc" ? "ascending" : "descending") : "none"}>
                  <Link href={sortHref("score")}>{SORT_LABEL.score}{arrow("score")}</Link>
                </th>
                <th>Segment</th>
                <th>CSM</th>
                <th>Plan</th>
                <th aria-sort={s.sort === "value" ? (s.dir === "asc" ? "ascending" : "descending") : "none"}>
                  <Link href={sortHref("value")}>{SORT_LABEL.value}{arrow("value")}</Link>
                </th>
                <th aria-sort={s.sort === "renewal" ? (s.dir === "asc" ? "ascending" : "descending") : "none"}>
                  <Link href={sortHref("renewal")}>Renewal{arrow("renewal")}</Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={7} className="empty">No accounts match these filters.</td></tr>
              )}
              {visible.map(({ e, segment }) => (
                <tr key={e.account.id}>
                  <td><Link href={`/accounts/${e.account.id}`}><strong>{e.account.name}</strong></Link></td>
                  <td><span className={`pill ${e.health.risk}`}>{e.health.score}</span></td>
                  <td>
                    <span className="chip" style={{ background: `${SEG_COLOR[segment]}1a`, color: SEG_COLOR[segment] }}>
                      {SEGMENTS[segment].label}
                    </span>
                  </td>
                  <td>{e.account.csm}</td>
                  <td>{e.account.plan}</td>
                  <td>{fmt(e.account.contract_value)}</td>
                  <td>{e.renewal.renewal_date} ({e.daysToRenewal}d)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <nav className="pager" aria-label="Pagination">
          {page > 1 ? <Link href={href({ page: page - 1 })}>← Previous</Link> : <span />}
          <span>Page {page} of {pages}</span>
          {page < pages ? <Link href={href({ page: page + 1 })}>Next →</Link> : <span />}
        </nav>
      </div>
    </main>
  );
}
