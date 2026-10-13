import metrics from "@/ml/metrics.json";
import model from "@/data/churn_model.json";
import { FEATURE_NAMES } from "@/lib/churn-features";

const LABEL: Record<(typeof FEATURE_NAMES)[number], string> = {
  seat_adoption: "Seat adoption",
  usage_change_pct: "Usage change %",
  open_tickets: "Open tickets",
  nps: "NPS",
  plan_growth: "Growth plan",
  plan_enterprise: "Enterprise plan",
  days_to_renewal: "Days to renewal",
  account_age_days: "Account age",
  negative_feedback_share: "Negative feedback share",
};
const NAME: Record<string, string> = { logistic_regression: "Logistic regression", random_forest: "Random forest" };

export default function ModelPage() {
  const coefs = FEATURE_NAMES.map((f, i) => ({ f, c: model.coefficients[i] })).sort((a, b) => Math.abs(b.c) - Math.abs(a.c));
  const maxC = Math.max(...coefs.map((x) => Math.abs(x.c)), 0.01);
  const importance = Object.entries(metrics.random_forest_feature_importance) as [keyof typeof LABEL, number][];
  const maxI = Math.max(...importance.map(([, v]) => v), 0.01);

  return (
    <main>
      <section className="hero">
        <div>
          <h1>Churn model</h1>
          <p className="sub">Trained offline with scikit-learn, shipped as plain JSON coefficients. No ML runs on the server.</p>
        </div>
        <span className="sim">Simulated labels</span>
      </section>

      <div className="banner">
        The churn labels are simulated (see <code>scripts/seed.ts</code>), so these metrics show how well the
        model recovers a synthetic pattern, not how it would perform on real customers.
      </div>

      <div className="card section">
        <h2>Model comparison</h2>
        <p className="hint">
          {metrics.n_accounts} accounts, {Math.round(metrics.churn_rate * 100)}% simulated churn rate, stratified
          {" "}{metrics.split.train}/{metrics.split.test} train/test split, threshold {metrics.threshold}.
        </p>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Model</th><th>AUC</th><th>Precision</th><th>Recall</th><th>Used in app</th></tr></thead>
            <tbody>
              {metrics.results.map((r) => (
                <tr key={r.model}>
                  <td><strong>{NAME[r.model] ?? r.model}</strong></td>
                  <td>{r.auc.toFixed(2)}</td>
                  <td>{r.precision.toFixed(2)}</td>
                  <td>{r.recall.toFixed(2)}</td>
                  <td>{r.model === "logistic_regression" ? "Yes" : "No (comparison only)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          Logistic regression ships because it is explainable per account and runs in a few lines of TypeScript.
        </p>
      </div>

      <div className="grid two">
        <div className="card">
          <h2>Logistic regression coefficients</h2>
          <p className="hint">Standardised features. Positive raises churn probability, negative lowers it.</p>
          {coefs.map(({ f, c }) => (
            <div className="hbar" key={f}>
              <span className="hl">{LABEL[f]}</span>
              <div className="ht"><div style={{ width: `${(Math.abs(c) / maxC) * 100}%`, background: "var(--brand)", opacity: c < 0 ? 0.45 : 1 }} /></div>
              <span className="hv">{c > 0 ? "+" : ""}{c.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>Random forest feature importance</h2>
          <p className="hint">Share of the forest&apos;s splits driven by each feature.</p>
          {importance.map(([f, v]) => (
            <div className="hbar" key={f}>
              <span className="hl">{LABEL[f]}</span>
              <div className="ht"><div style={{ width: `${(v / maxI) * 100}%`, background: "var(--brand)" }} /></div>
              <span className="hv">{(v * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card section">
        <h2>Retrain</h2>
        <p className="kv"><code>npm run seed</code> then <code>python ml/train_churn.py</code> (needs <code>ml/requirements.txt</code>). Last trained {metrics.trained_at.slice(0, 10)}.</p>
      </div>
    </main>
  );
}
