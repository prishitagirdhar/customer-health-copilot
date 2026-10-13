import type { SegmentKey } from "./strategy";

/** Compact USD formatter used across pages. */
export const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`;

export const SEG_COLOR: Record<SegmentKey, string> = {
  onboard: "#0ea5e9",
  rescue: "#e5484d",
  "secure-renewal": "#d98a00",
  reengage: "#8b5cf6",
  expand: "#1fa971",
  advocate: "#64748b",
};
