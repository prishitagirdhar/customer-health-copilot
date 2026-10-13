import type { Account, HealthResult, TaskSpec } from "./types";

/**
 * Rule-based playbook engine. Each rule maps an account state to a CSM action.
 * Add new rules here; the dashboard and API pick them up automatically.
 */
export function evaluatePlaybooks(
  a: Account,
  h: HealthResult,
  daysToRenewal: number,
  daysSinceSigned: number
): TaskSpec[] {
  const tasks: TaskSpec[] = [];
  const base = { account_id: a.id };

  if (h.risk === "High" && daysToRenewal >= 0 && daysToRenewal <= 90) {
    tasks.push({
      ...base,
      playbook: "renewal-risk",
      title: `Renewal at risk: escalate ${a.name} to Sales`,
      description: `Health ${h.score}, renewal in ${daysToRenewal} days. ${h.reason}. Loop in the AE and plan an exec call.`,
      priority: "High",
      due_in_days: 2,
    });
  }

  if (a.nps_latest <= -20) {
    tasks.push({
      ...base,
      playbook: "detractor-call",
      title: `Detractor NPS: call ${a.name} within 48h`,
      description: `NPS ${a.nps_latest}. Find the root cause and log it for Product.`,
      priority: "High",
      due_in_days: 2,
    });
  }

  if (h.parts.adoption < 40) {
    tasks.push({
      ...base,
      playbook: "low-adoption",
      title: `Low adoption: schedule re-training for ${a.name}`,
      description: `${h.reason}. Run a refresher session and check admin configuration.`,
      priority: "Normal",
      due_in_days: 7,
    });
  }

  if (a.onboarding_stage !== "Live" && daysSinceSigned > 45) {
    tasks.push({
      ...base,
      playbook: "onboarding-stalled",
      title: `Onboarding stalled at ${a.onboarding_stage}: ${a.name}`,
      description: `Signed ${daysSinceSigned} days ago and not live yet. Identify the blocker with their admin.`,
      priority: "High",
      due_in_days: 3,
    });
  }

  if (h.risk === "Low" && h.parts.adoption >= 85 && daysToRenewal > 90) {
    tasks.push({
      ...base,
      playbook: "expansion",
      title: `Expansion opportunity: ${a.name}`,
      description: `Adoption is ${Math.round(h.parts.adoption)}% with a healthy score of ${h.score}. Explore more seats or the Cards module.`,
      priority: "Low",
      due_in_days: 14,
    });
  }

  return tasks;
}
