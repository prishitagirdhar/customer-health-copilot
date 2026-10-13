import type { EnrichedAccount } from "./data";
import { evaluatePlaybooks } from "./playbooks";
import type { Priority, TaskSpec } from "./types";

export type TaskStatus = "todo" | "doing" | "done";

export interface BoardTask extends TaskSpec {
  id: string; // stable: account + playbook, so saved statuses survive reloads
  account_name: string;
  csm: string;
  due_date: string; // ISO date
}

const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Normal: 1, Low: 2 };
const DAY = 86400000;

/** One task per triggered playbook rule per account. */
export function buildTasks(accounts: EnrichedAccount[]): BoardTask[] {
  const now = Date.now();
  return accounts
    .flatMap((e) =>
      evaluatePlaybooks(e.account, e.health, e.daysToRenewal, e.daysSinceSigned).map((t) => ({
        ...t,
        id: `${t.account_id}:${t.playbook}`,
        account_name: e.account.name,
        csm: e.account.csm,
        due_date: new Date(now + t.due_in_days * DAY).toISOString().slice(0, 10),
      }))
    )
    .sort(
      (a, b) =>
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.due_in_days - b.due_in_days
    );
}
