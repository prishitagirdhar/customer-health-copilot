"use client";

import { useState } from "react";

type Panel = "call" | "task" | "email" | null;

export default function QuickActions({ emailDraft }: { emailDraft: string }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(emailDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));

  return (
    <div className="card section">
      <h2>Quick actions</h2>
      <div className="chips">
        <button type="button" className="btn" aria-pressed={panel === "call"} onClick={() => toggle("call")}>Log a call</button>
        <button type="button" className="btn" aria-pressed={panel === "task"} onClick={() => toggle("task")}>Create task</button>
        <button type="button" className="btn" aria-pressed={panel === "email"} onClick={() => toggle("email")}>Draft email</button>
      </div>
      {(panel === "call" || panel === "task") && (
        <p className="banner" role="status">
          Demo only: this action is not saved. In a real build it would write to the CRM.
        </p>
      )}
      {panel === "email" && (
        <div className="draft">
          <textarea readOnly value={emailDraft} rows={14} aria-label="Email draft" />
          <button type="button" className="btn" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
        </div>
      )}
    </div>
  );
}
