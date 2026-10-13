# Customer Health & Renewal Copilot

A mini Customer Success platform for a B2B SaaS company (travel and expense). It scores account health,
predicts churn, flags renewal risk, analyses customer feedback and creates playbook tasks for CSMs.

> **All data is simulated.** It is not from any real company, and that includes the churn labels used to
> train the model. No paid APIs or services are used anywhere. Everything runs on Vercel's free plan.

## Run it

```bash
npm install
npm run seed      # generates data/seed.json (500 simulated accounts, deterministic)
npm run dev       # http://localhost:3000
npm run build     # production build
```

Run the commands from the inner `customer-health-copilot` folder (the one with `package.json`).

## Pages

| Route | What it does |
|---|---|
| `/` | Portfolio dashboard: KPIs, health distribution, churn drivers, voice of customer, strategy segments, focus list. Filters for CSM, plan, region and risk, kept in the URL |
| `/accounts` | Searchable, sortable, paginated account table with risk and segment chips and CSV export of the filtered view |
| `/accounts/[id]` | Account 360 with tabs (Overview, Strategy, Contacts, Activity, Feedback, Tasks), health gauge, churn probability, quick actions and an email draft |
| `/tasks` | Kanban of playbook tasks. Drag and drop or use the dropdown. Status is stored in the browser (localStorage), not a database |
| `/renewals` | Renewals in the next 180 days, bucketed by timing, with value by risk level |
| `/model` | Churn model metrics, coefficients and feature importance |
| `/ask` | Placeholder |

API: `/api/strategy`, `/api/playbooks/run` (both accept `?csm=&plan=&region=&risk=`), `/api/accounts/export` (CSV).

## Structure

```
app/                  Next.js pages and API routes
components/           Sidebar, FilterBar, TaskBoard, HealthGauge, ActivityTimeline, QuickActions, ThemeToggle
lib/
  scoring.ts          Weighted health score + "why at risk" explanation
  playbooks.ts        Rule engine: account state -> CSM tasks
  strategy.ts         Lifecycle segments, cadence, next best actions
  sentiment.ts        Rule-based sentiment + complaint themes
  churn-features.ts   Feature definitions shared by seed, trainer and runtime
  churn.ts            Applies the exported churn model (no ML libraries needed)
  filters.ts          URL-driven dashboard filters
  account-list.ts     Accounts table filter, sort, pagination, CSV
  tasks.ts            Builds board tasks from playbooks
  data.ts             Loads and enriches the dataset
ml/                   Offline training (Python, not deployed)
scripts/seed.ts       Synthetic data generator (deterministic)
supabase/schema.sql   CRM tables
```

## Health score

| Component | Weight | Meaning |
|---|---|---|
| Adoption | 35% | Active seats / licensed seats |
| Usage trend | 25% | Bookings in last 30 days vs previous 30 |
| Support tickets | 15% | Open tickets (7+ scores zero) |
| NPS | 25% | Latest account NPS |

Risk: High below 50, Medium 50 to 69, Low 70 and above.

## Churn model

Trained offline, shipped as JSON, scored in TypeScript.

1. `scripts/seed.ts` adds a simulated historical `churned` label per account. It depends on the model
   features, a hidden factor the model never sees, and random noise, with weights that differ from the
   health score. A separate random stream keeps the accounts themselves unchanged.
2. `ml/train_churn.py` (scikit-learn, pandas) builds the features, trains logistic regression and a random
   forest on a stratified 75/25 split, and writes `ml/metrics.json`.
3. The logistic regression coefficients, intercept and scaling go to `data/churn_model.json`.
   `lib/churn.ts` applies them at request time, so nothing heavy runs on Vercel.

Features: seat adoption, usage change %, open tickets, NPS, plan, days to renewal, account age, share of
negative feedback (scored 6 or lower).

Latest test-set results: logistic regression AUC 0.80, precision 0.77, recall 0.57; random forest AUC 0.84,
precision 0.79, recall 0.50. **These measure how well the model recovers a synthetic pattern, not real-world
accuracy.**

Retrain:

```bash
npm run seed
python -m venv ml/.venv
ml/.venv/Scripts/python -m pip install -r ml/requirements.txt   # macOS/Linux: ml/.venv/bin/python
ml/.venv/Scripts/python ml/train_churn.py
```

Re-run both after changing anything in `lib/churn-features.ts`.

## Playbooks

| Rule | Trigger | Action |
|---|---|---|
| renewal-risk | High risk and renewal within 90 days | Escalate to Sales within 2 days |
| detractor-call | NPS of -20 or lower | Call within 48 hours |
| low-adoption | Adoption component below 40 | Schedule re-training |
| onboarding-stalled | Not live 45+ days after signing | Unblock onboarding |
| expansion | Low risk, adoption 85%+, renewal 90+ days away | Explore upsell |

## CRM strategy engine (`lib/strategy.ts`)

| Segment | Rule | Objective |
|---|---|---|
| Onboard & Activate | Not live yet | Go live and start booking within 60 days |
| Rescue | High risk | Remove the main churn driver before renewal |
| Secure Renewal | Renewal within 120 days | Close the renewal early, hand off to Sales |
| Re-engage & Adopt | Medium risk | Lift adoption before it becomes high risk |
| Expand | Low risk, adoption 85%+ | Grow seats or modules |
| Nurture & Advocate | Everything else healthy | Keep happy, collect references |

Priority = health gap + renewal urgency + contract value.

## Known limits

- Task status lives in the browser only. A real build would store it in Supabase.
- Dates in the seed are relative to the day it was generated. Re-run `npm run seed` and the trainer to refresh.
- Quick actions "Log a call" and "Create task" are demo only.

## Roadmap

1. Persist tasks to Supabase and add login with a "my accounts" view.
2. Ask Copilot page (rule-based Q&A over the portfolio).
3. Template-based QBR talking points per account.

## Deploy

Push to GitHub and import into Vercel. Commit `data/seed.json` and `data/churn_model.json`; the app reads
both at runtime. Python and `ml/` are only needed locally.
