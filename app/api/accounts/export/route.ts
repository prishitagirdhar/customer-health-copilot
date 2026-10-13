import { loadEnriched } from "@/lib/data";
import { filterAndSort, parseListState, toCsv } from "@/lib/account-list";
import type { SearchParams } from "@/lib/filters";

export const dynamic = "force-dynamic";

/** CSV of the accounts list with the same filters and sort as the page (all pages). */
export async function GET(req: Request) {
  const { accounts } = loadEnriched();
  const csms = Array.from(new Set(accounts.map((e) => e.account.csm)));
  const sp: SearchParams = Object.fromEntries(new URL(req.url).searchParams);
  const rows = filterAndSort(accounts, parseListState(sp, csms));

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="accounts-simulated.csv"',
    },
  });
}
