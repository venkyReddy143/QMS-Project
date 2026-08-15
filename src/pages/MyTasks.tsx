import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

const INITIAL_TASKS = [
  {
    id: 't1',
    title: 'Release Batch 2 to CNC cells',
    area: 'CNC Bay',
    priority: 'High',
    done: false,
  },
  {
    id: 't2',
    title: 'Confirm Shift B manpower for Coating',
    area: 'Coating Line',
    priority: 'Medium',
    done: false,
  },
  {
    id: 't3',
    title: 'Check FURN-01 temperature log',
    area: 'Casting',
    priority: 'High',
    done: true,
  },
  {
    id: 't4',
    title: 'Update progress for PO-2026-0041',
    area: 'Control Room',
    priority: 'Medium',
    done: false,
  },
]

export function MyTasks() {
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const openCount = tasks.filter((task) => !task.done).length

  function toggleTask(id: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold text-foreground">My Tasks</h2>
        <p className="mt-1 text-base text-muted">
          Today’s floor and planning tasks. Tap a task to mark complete.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-muted">Open Tasks</p>
          <p className="mt-1 text-3xl font-bold text-warning">{openCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-muted">Completed</p>
          <p className="mt-1 text-3xl font-bold text-success">
            {tasks.length - openCount}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => toggleTask(task.id)}
            className="flex min-h-16 w-full items-start gap-3 rounded-2xl border border-border bg-surface-raised p-4 text-left transition hover:border-accent"
          >
            {task.done ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" />
            ) : (
              <Circle className="mt-0.5 h-6 w-6 shrink-0 text-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p
                className={`text-lg font-bold ${
                  task.done ? 'text-muted line-through' : 'text-foreground'
                }`}
              >
                {task.title}
              </p>
              <p className="mt-1 text-sm text-muted">
                {task.area} · Priority: {task.priority}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                task.priority === 'High'
                  ? 'bg-red-100 text-danger'
                  : 'bg-amber-100 text-warning'
              }`}
            >
              {task.priority}
            </span>
          </button>
        ))}
      </section>
    </div>
  )
}
