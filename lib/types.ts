export type Plan = "Starter" | "Growth" | "Enterprise";
export type RiskLevel = "High" | "Medium" | "Low";
export type OnboardingStage = "Kickoff" | "Configuration" | "Training" | "Live";
export type RenewalStage = "Upcoming" | "In Negotiation" | "Won" | "Churned";
export type Priority = "High" | "Normal" | "Low";
export type ComponentKey = "adoption" | "usage" | "tickets" | "nps";

export interface Account {
  id: string;
  name: string;
  industry: string;
  region: "US" | "India";
  plan: Plan;
  contract_value: number;
  seats_licensed: number;
  seats_active: number;
  bookings_last_30: number;
  bookings_prev_30: number;
  open_tickets: number;
  nps_latest: number; // account-level NPS, -100..100
  csm: string;
  signed_on: string; // ISO date
  onboarding_stage: OnboardingStage;
}

export interface Contact {
  id: string;
  account_id: string;
  name: string;
  email: string;
  role: "Admin" | "Champion" | "Finance";
}

export interface Renewal {
  id: string;
  account_id: string;
  renewal_date: string; // ISO date
  amount: number;
  stage: RenewalStage;
}

export interface Feedback {
  id: string;
  account_id: string;
  score: number; // 0..10
  comment: string;
  created_on: string;
}

export interface Activity {
  id: string;
  account_id: string;
  type: "Call" | "Email" | "QBR" | "Note";
  note: string;
  occurred_on: string;
}

export interface HealthResult {
  score: number;
  risk: RiskLevel;
  driver: ComponentKey;
  reason: string; // human-readable "why"
  parts: Record<ComponentKey, number>;
}

export interface TaskSpec {
  account_id: string;
  playbook: string;
  title: string;
  description: string;
  priority: Priority;
  due_in_days: number;
}

/** Simulated historical outcome used only to train the churn model offline. */
export interface ChurnLabel {
  account_id: string;
  churned: boolean;
}

export interface RawDataset {
  generated_at: string;
  note: string;
  accounts: Account[];
  contacts: Contact[];
  renewals: Renewal[];
  feedback: Feedback[];
  activities: Activity[];
  churn_labels: ChurnLabel[];
}
