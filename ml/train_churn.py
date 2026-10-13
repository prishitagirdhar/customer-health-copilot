"""
Offline churn model training (run locally; nothing here runs on Vercel).

  pip install -r ml/requirements.txt
  python ml/train_churn.py

Reads  data/seed.json          (accounts, renewals, feedback, simulated churn_labels)
Writes ml/metrics.json         (AUC / precision / recall for both models)
       data/churn_model.json   (logistic regression coefficients + scaling, used by lib/churn.ts)

IMPORTANT: the churn labels are SIMULATED (see scripts/seed.ts), so the metrics show how well
the model recovers a synthetic process, not how it would perform on real customers.

Feature definitions mirror lib/churn-features.ts. Keep them in sync.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / "data" / "seed.json"
METRICS_OUT = ROOT / "ml" / "metrics.json"
MODEL_OUT = ROOT / "data" / "churn_model.json"

RANDOM_STATE = 42
NEGATIVE_SCORE_MAX = 6  # feedback scored <= 6 counts as negative

FEATURES = [
    "seat_adoption",
    "usage_change_pct",
    "open_tickets",
    "nps",
    "plan_growth",
    "plan_enterprise",
    "days_to_renewal",
    "account_age_days",
    "negative_feedback_share",
]


def day_diff(later: str, earlier: pd.Timestamp) -> float:
    return (pd.Timestamp(later) - earlier).days


def build_frame(data: dict) -> pd.DataFrame:
    as_of = pd.Timestamp(datetime.fromisoformat(data["generated_at"].replace("Z", "+00:00"))).tz_convert(None).normalize()

    acc = pd.DataFrame(data["accounts"])
    ren = pd.DataFrame(data["renewals"])[["account_id", "renewal_date"]]
    lab = pd.DataFrame(data["churn_labels"])
    fb = pd.DataFrame(data["feedback"])

    neg = (
        fb.assign(neg=fb["score"] <= NEGATIVE_SCORE_MAX)
        .groupby("account_id")["neg"]
        .mean()
        .rename("negative_feedback_share")
        .reset_index()
    )

    df = (
        acc.merge(ren, left_on="id", right_on="account_id")
        .drop(columns="account_id")
        .merge(lab, left_on="id", right_on="account_id")
        .merge(neg, on="account_id", how="left")
    )
    df["negative_feedback_share"] = df["negative_feedback_share"].fillna(0.0)

    df["seat_adoption"] = df["seats_active"] / df["seats_licensed"].clip(lower=1) * 100
    df["usage_change_pct"] = (df["bookings_last_30"] - df["bookings_prev_30"]) / df["bookings_prev_30"].clip(lower=1) * 100
    df["nps"] = df["nps_latest"]
    df["plan_growth"] = (df["plan"] == "Growth").astype(int)
    df["plan_enterprise"] = (df["plan"] == "Enterprise").astype(int)
    df["days_to_renewal"] = df["renewal_date"].map(lambda d: day_diff(d, as_of))
    df["account_age_days"] = df["signed_on"].map(lambda d: (as_of - pd.Timestamp(d)).days)
    df["churned"] = df["churned"].astype(int)
    return df


def evaluate(name: str, model, X_test, y_test) -> dict:
    proba = model.predict_proba(X_test)[:, 1]
    pred = (proba >= 0.5).astype(int)
    return {
        "model": name,
        "auc": round(float(roc_auc_score(y_test, proba)), 4),
        "precision": round(float(precision_score(y_test, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, pred, zero_division=0)), 4),
    }


def main() -> None:
    data = json.loads(SEED.read_text(encoding="utf8"))
    if "churn_labels" not in data:
        raise SystemExit("data/seed.json has no churn_labels. Run `npm run seed` first.")

    df = build_frame(data)
    X, y = df[FEATURES], df["churned"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, stratify=y, random_state=RANDOM_STATE
    )

    scaler = StandardScaler().fit(X_train)
    logreg = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE).fit(scaler.transform(X_train), y_train)

    # Trees do not need scaling
    forest = RandomForestClassifier(
        n_estimators=300, min_samples_leaf=5, random_state=RANDOM_STATE
    ).fit(X_train, y_train)

    class Scaled:  # lets evaluate() treat logreg + scaler as one model
        predict_proba = staticmethod(lambda X_: logreg.predict_proba(scaler.transform(X_)))

    results = [
        evaluate("logistic_regression", Scaled, X_test, y_test),
        evaluate("random_forest", forest, X_test, y_test),
    ]

    metrics = {
        "note": "Labels are SIMULATED (scripts/seed.ts). Metrics measure recovery of a synthetic process, not real-world performance.",
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "n_accounts": int(len(df)),
        "churn_rate": round(float(y.mean()), 4),
        "split": {"train": int(len(X_train)), "test": int(len(X_test)), "test_size": 0.25, "stratified": True},
        "threshold": 0.5,
        "results": results,
        "random_forest_feature_importance": {
            f: round(float(v), 4) for f, v in sorted(zip(FEATURES, forest.feature_importances_), key=lambda t: -t[1])
        },
    }
    METRICS_OUT.write_text(json.dumps(metrics, indent=2), encoding="utf8")

    # The shipped model is the logistic regression: interpretable, and trivial to run in TypeScript.
    model = {
        "note": "SIMULATED training labels. Logistic regression exported from ml/train_churn.py.",
        "features": FEATURES,
        "mean": [round(float(v), 6) for v in scaler.mean_],
        "scale": [round(float(v), 6) for v in scaler.scale_],
        "coefficients": [round(float(v), 6) for v in logreg.coef_[0]],
        "intercept": round(float(logreg.intercept_[0]), 6),
        "auc": results[0]["auc"],
    }
    MODEL_OUT.write_text(json.dumps(model, indent=2), encoding="utf8")

    print(json.dumps(results, indent=2))
    print(f"wrote {METRICS_OUT.relative_to(ROOT)} and {MODEL_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
