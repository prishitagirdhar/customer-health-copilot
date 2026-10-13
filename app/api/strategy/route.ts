import { NextResponse } from "next/server";
import { loadEnriched } from "@/lib/data";
import { applyFilters, parseFilters, type SearchParams } from "@/lib/filters";
import { portfolioStrategy, strategyFor } from "@/lib/strategy";

export const dynamic = "force-dynamic";

/**
 * Portfolio strategy summary plus the top 50 accounts to act on.
 * Accepts the dashboard filters as query params: ?csm=&plan=&region=&risk=
 */
export async function GET(req: Request) {
  const { accounts: all } = loadEnriched();
  const csms = Array.from(new Set(all.map((e) => e.account.csm)));
  const sp: SearchParams = Object.fromEntries(new URL(req.url).searchParams);
  const accounts = applyFilters(all, parseFilters(sp, csms));

  const focus = accounts
    .map((e) => ({
      account_id: e.account.id,
      account_name: e.account.name,
      health_score: e.health.score,
      ...strategyFor(e),
    }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 50);

  return NextResponse.json({ segments: portfolioStrategy(accounts), focus });
}
