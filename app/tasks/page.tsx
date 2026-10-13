import TaskBoard from "@/components/TaskBoard";
import { loadEnriched } from "@/lib/data";
import { buildTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default function TasksPage() {
  const { accounts } = loadEnriched();
  const tasks = buildTasks(accounts);
  const csms = Array.from(new Set(accounts.map((e) => e.account.csm))).sort();

  return (
    <main>
      <section className="hero">
        <div>
          <h1>Tasks</h1>
          <p className="sub">{tasks.length} playbook tasks generated from account health. Drag cards or use the dropdown to change status.</p>
        </div>
        <span className="sim">Simulated data</span>
      </section>
      <TaskBoard tasks={tasks} csms={csms} />
    </main>
  );
}
