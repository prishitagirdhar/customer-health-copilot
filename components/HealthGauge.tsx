import type { RiskLevel } from "@/lib/types";

const COLOR: Record<RiskLevel, string> = { High: "var(--high)", Medium: "var(--med)", Low: "var(--low)" };

/** Half-circle gauge, 0-100, coloured by risk level. */
export default function HealthGauge({ score, risk }: { score: number; risk: RiskLevel }) {
  return (
    <figure className="gauge" aria-label={`Health score ${score} out of 100, ${risk} risk`}>
      <svg viewBox="0 0 120 70" role="img" aria-hidden="true">
        <path d="M10 60 A50 50 0 0 1 110 60" pathLength={100} fill="none" stroke="var(--track)" strokeWidth="10" strokeLinecap="round" />
        <path d="M10 60 A50 50 0 0 1 110 60" pathLength={100} fill="none" stroke={COLOR[risk]} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${score} 100`} />
        <text x="60" y="56" textAnchor="middle" className="gauge-num">{score}</text>
      </svg>
      <figcaption><span className={`pill ${risk}`}>{risk} risk</span></figcaption>
    </figure>
  );
}
