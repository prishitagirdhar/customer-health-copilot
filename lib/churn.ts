import model from "@/data/churn_model.json";
import { churnFeatures, type ChurnFeatures, type FeatureName } from "./churn-features";
import type { EnrichedAccount } from "./data";
import type { Feedback } from "./types";

/**
 * Runtime churn scoring. The logistic regression is trained offline
 * (ml/train_churn.py) on SIMULATED labels; here we only apply the exported
 * coefficients, so it runs anywhere with no ML dependencies.
 */
export interface ChurnPrediction {
  probability: number; // 0-1
  /** Top features pushing the probability up, by contribution to the logit. */
  drivers: { feature: FeatureName; contribution: number }[];
}

const FEATURES = model.features as FeatureName[];

export function predictChurn(f: ChurnFeatures): ChurnPrediction {
  const contributions = FEATURES.map((name, i) => {
    const z = (f[name] - model.mean[i]) / (model.scale[i] || 1);
    return { feature: name, contribution: z * model.coefficients[i] };
  });
  const logit = contributions.reduce((s, c) => s + c.contribution, model.intercept);
  return {
    probability: 1 / (1 + Math.exp(-logit)),
    drivers: contributions
      .filter((c) => c.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3),
  };
}

export function predictForAccount(
  e: EnrichedAccount,
  feedback: Pick<Feedback, "score">[]
): ChurnPrediction {
  return predictChurn(
    churnFeatures({
      account: e.account,
      daysToRenewal: e.daysToRenewal,
      accountAgeDays: e.daysSinceSigned,
      feedback,
    })
  );
}

export const CHURN_MODEL_INFO = { auc: model.auc, note: model.note };
