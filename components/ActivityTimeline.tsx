import type { Activity } from "@/lib/types";

const ICONS: Record<Activity["type"], React.ReactNode> = {
  Call: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  Email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  QBR: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  Note: <><path d="M6 3h9l4 4v14H6z" /><path d="M9 12h7M9 16h7" /></>,
};

export default function ActivityTimeline({ items }: { items: Activity[] }) {
  if (items.length === 0) return <p className="kv">No activity logged.</p>;
  return (
    <ol className="timeline">
      {items.map((a) => (
        <li key={a.id}>
          <span className="tl-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[a.type]}
            </svg>
          </span>
          <div>
            <div><strong>{a.type}</strong> · <span className="muted">{a.occurred_on}</span></div>
            <div>{a.note}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
