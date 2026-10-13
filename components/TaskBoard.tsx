"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BoardTask, TaskStatus } from "@/lib/tasks";

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "Not Started" },
  { key: "doing", label: "In Progress" },
  { key: "done", label: "Done" },
];
const STORAGE_KEY = "chc-task-status";

export default function TaskBoard({ tasks, csms }: { tasks: BoardTask[]; csms: string[] }) {
  const [status, setStatus] = useState<Record<string, TaskStatus>>({});
  const [csm, setCsm] = useState("");
  const [priority, setPriority] = useState("");
  const [over, setOver] = useState<TaskStatus | null>(null);

  // Read saved statuses after mount so server and client markup match
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setStatus(JSON.parse(saved));
    } catch {
      /* storage unavailable: board still works for this visit */
    }
  }, []);

  function move(id: string, to: TaskStatus) {
    setStatus((prev) => {
      const next = { ...prev, [id]: to };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const visible = tasks.filter((t) => (!csm || t.csm === csm) && (!priority || t.priority === priority));
  const statusOf = (t: BoardTask): TaskStatus => status[t.id] ?? "todo";

  return (
    <>
      <div className="filters card">
        <label className="filter">
          <span>CSM</span>
          <select value={csm} onChange={(e) => setCsm(e.target.value)}>
            <option value="">All</option>
            {csms.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="filter">
          <span>Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All</option>
            {["High", "Normal", "Low"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <div className="filter-meta">
          <span>Status is stored in this browser (localStorage) for this demo.</span>
        </div>
      </div>

      <div className="board">
        {COLUMNS.map((col) => {
          const items = visible.filter((t) => statusOf(t) === col.key);
          return (
            <section
              key={col.key}
              className={`col${over === col.key ? " over" : ""}`}
              aria-label={col.label}
              onDragOver={(e) => { e.preventDefault(); setOver(col.key); }}
              onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) move(id, col.key);
              }}
            >
              <h2>{col.label} <span className="count">{items.length}</span></h2>
              <div className="col-body">
                {items.length === 0 && <p className="hint">No tasks</p>}
                {items.map((t) => (
                  <article
                    key={t.id}
                    className="tcard"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                  >
                    <div className="tcard-top">
                      <span className={`prio-tag ${t.priority}`}>{t.priority}</span>
                      <span className="tag">{t.playbook}</span>
                    </div>
                    <div className="tcard-title">{t.title}</div>
                    <div className="tcard-meta">
                      <Link href={`/accounts/${t.account_id}`}>{t.account_name}</Link>
                      <span>Due {t.due_date}</span>
                    </div>
                    <div className="tcard-meta"><span>{t.csm}</span></div>
                    <select
                      aria-label={`Move task for ${t.account_name}`}
                      value={statusOf(t)}
                      onChange={(e) => move(t.id, e.target.value as TaskStatus)}
                    >
                      {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
