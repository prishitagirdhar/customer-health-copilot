import { NextResponse } from "next/server";
import { loadEnriched } from "@/lib/data";
import { applyFilters, parseFilters, type SearchParams } from "@/lib/filters";
import { evaluatePlaybooks } from "@/lib/playbooks";

export const dynamic = "force-dynamic";

/**
 * Preview of the tasks the playbook engine would create right now.
 * Accepts the dashboard filters as query params: ?csm=&plan=&region=&risk=
 */
export async function GET(req: Request) {
  const { accounts: all } = loadEnriched();
  const csms = Array.from(new Set(all.map((e) => e.account.csm)));
  const sp: SearchParams = Object.fromEntries(new URL(req.url).searchParams);
  const accounts = applyFilters(all, parseFilters(sp, csms));

  const tasks = accounts.flatMap((e) =>
    evaluatePlaybooks(e.account, e.health, e.daysToRenewal, e.daysSinceSigned).map((t) => ({
      ...t,
      account_name: e.account.name,
      csm: e.account.csm,
    }))
  );

  const byPlaybook: Record<string, number> = {};
  tasks.forEach((t) => (byPlaybook[t.playbook] = (byPlaybook[t.playbook] ?? 0) + 1));

  return NextResponse.json({ total: tasks.length, byPlaybook, tasks: tasks.slice(0, 100) });
}
