/**
 * Free, rule-based feedback analysis: lexicon sentiment + keyword themes.
 * No external API. Swap in a Hugging Face model later if you want.
 */
const POSITIVE = new Set([
  "love", "loves", "great", "smooth", "fast", "painless", "responsive", "saved",
  "easy", "good", "helpful", "excellent", "reliable", "happy", "improved",
]);
const NEGATIVE = new Set([
  "slow", "stuck", "confusing", "broken", "crashing", "rushed", "problem",
  "issues", "difficult", "frustrating", "expensive", "high", "unhappy", "late",
  "many", "long", "poor",
]);
const NEGATORS = new Set(["not", "no", "never", "cannot", "can't", "isn't", "don't", "hardly"]);

export const THEMES: Record<string, string[]> = {
  "Approval delays": ["approval", "approve", "workflow"],
  "Refund issues": ["refund", "reimburse"],
  Reporting: ["report", "export", "dashboard"],
  Support: ["support", "ticket", "response"],
  Onboarding: ["onboarding", "trained", "training"],
  Pricing: ["pricing", "price", "expensive", "cost"],
  Integrations: ["integration", "erp", "accounting", "sync"],
  "Mobile app": ["mobile", "app "],
  Booking: ["booking", "booked", "trip"],
};

export type Sentiment = "positive" | "neutral" | "negative";

export function analyzeComment(text: string): { sentiment: Sentiment; score: number; themes: string[] } {
  const lower = text.toLowerCase();
  const tokens = lower.replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);

  let score = 0;
  tokens.forEach((t, i) => {
    const negated = i > 0 && NEGATORS.has(tokens[i - 1]);
    if (POSITIVE.has(t)) score += negated ? -1 : 1;
    else if (NEGATIVE.has(t)) score += negated ? 1 : -1;
  });

  const sentiment: Sentiment = score >= 1 ? "positive" : score <= -1 ? "negative" : "neutral";
  const themes = Object.entries(THEMES)
    .filter(([, words]) => words.some((w) => lower.includes(w)))
    .map(([name]) => name);

  return { sentiment, score, themes };
}
