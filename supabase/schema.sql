-- Customer Health and Renewal Copilot: mini CRM schema (all data is SIMULATED)
-- Run this in the Supabase SQL editor, then `npm run seed:supabase`.

create table if not exists accounts (
  id text primary key,
  name text not null,
  industry text,
  region text check (region in ('US', 'India')),
  plan text check (plan in ('Starter', 'Growth', 'Enterprise')),
  contract_value numeric not null,
  seats_licensed int not null,
  seats_active int not null,
  bookings_last_30 int not null,
  bookings_prev_30 int not null,
  open_tickets int not null default 0,
  nps_latest int,
  csm text,
  signed_on date not null,
  onboarding_stage text check (onboarding_stage in ('Kickoff', 'Configuration', 'Training', 'Live')),
  -- computed by the scoring engine and written back
  health_score int,
  risk_level text check (risk_level in ('High', 'Medium', 'Low')),
  churn_driver text
);

create table if not exists contacts (
  id text primary key,
  account_id text references accounts(id) on delete cascade,
  name text not null,
  email text,
  role text check (role in ('Admin', 'Champion', 'Finance'))
);

create table if not exists renewals (
  id text primary key,
  account_id text references accounts(id) on delete cascade,
  renewal_date date not null,
  amount numeric not null,
  stage text check (stage in ('Upcoming', 'In Negotiation', 'Won', 'Churned'))
);

create table if not exists tasks (
  id bigint generated always as identity primary key,
  account_id text references accounts(id) on delete cascade,
  playbook text not null,
  title text not null,
  description text,
  priority text check (priority in ('High', 'Normal', 'Low')),
  due_on date,
  status text not null default 'Not Started'
    check (status in ('Not Started', 'In Progress', 'Done')),
  created_at timestamptz not null default now()
);

create table if not exists activities (
  id text primary key,
  account_id text references accounts(id) on delete cascade,
  type text check (type in ('Call', 'Email', 'QBR', 'Note')),
  note text,
  occurred_on date not null
);

create table if not exists feedback (
  id text primary key,
  account_id text references accounts(id) on delete cascade,
  score int check (score between 0 and 10),
  comment text,
  created_on date not null,
  sentiment text,
  themes text[]
);

create index if not exists idx_renewals_date on renewals(renewal_date);
create index if not exists idx_tasks_account on tasks(account_id);
create index if not exists idx_feedback_account on feedback(account_id);
