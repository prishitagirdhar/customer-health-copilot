import fs from "node:fs";
import path from "node:path";
import { computeHealth } from "./scoring";
import { analyzeComment } from "./sentiment";
import type { Account, Feedback, HealthResult, RawDataset, Renewal } from "./types";

export interface EnrichedAccount {
  account: Account;
  health: HealthResult;
  renewal: Renewal;
  daysToRenewal: number;
  daysSinceSigned: number;
}

const DAY = 86400000;

export function loadDataset(): RawDataset {
  const file = path.join(process.cwd(), "data", "seed.json");
  if (!fs.existsSync(file)) {
    throw new Error("data/seed.json not found. Run `npm run seed` first.");
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as RawDataset;
}

export function loadEnriched() {
  const raw = loadDataset();
  const renewalByAccount = new Map(raw.renewals.map((r) => [r.account_id, r]));
  const now = Date.now();

  const accounts: EnrichedAccount[] = raw.accounts.map((account) => {
    const renewal = renewalByAccount.get(account.id)!;
    return {
      account,
      health: computeHealth(account),
      renewal,
      daysToRenewal: Math.round((new Date(renewal.renewal_date).getTime() - now) / DAY),
      daysSinceSigned: Math.round((now - new Date(account.signed_on).getTime()) / DAY),
    };
  });

  const feedback = raw.feedback.map((f: Feedback) => ({ ...f, ...analyzeComment(f.comment) }));
  return { raw, accounts, feedback };
}
