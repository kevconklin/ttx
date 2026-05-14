"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import type { Client, Exercise, ExerciseStatus } from "@/types";

const STATUS_ORDER: ExerciseStatus[] = [
  "scoping",
  "scenarios_generated",
  "sent_for_review",
  "in_progress",
  "completed",
];

interface Props {
  exercise: Exercise;
  client: Client;
  onRefresh: () => Promise<void> | void;
}

export default function OverviewTab({ exercise, client, onRefresh }: Props) {
  const toast = useToast();
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (next: ExerciseStatus) => {
    setUpdating(true);
    try {
      await api.updateExerciseStatus(exercise.id, next);
      toast.success(`Status → ${next.replace(/_/g, " ")}`);
      await onRefresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card p-6 lg:col-span-2">
        <h2 className="text-sm font-semibold text-ink">Exercise details</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div><dt className="label">Client</dt><dd className="mt-1 text-ink">{client.name}</dd></div>
          <div><dt className="label">Type</dt><dd className="mt-1 text-ink">{exercise.exercise_type.replace(/_/g, " ")}</dd></div>
          <div><dt className="label">Scheduled</dt><dd className="mt-1 font-mono text-xs text-ink">{exercise.scheduled_date ?? "—"}</dd></div>
          <div><dt className="label">Completed</dt><dd className="mt-1 font-mono text-xs text-ink">{exercise.completed_date ?? "—"}</dd></div>
          <div className="sm:col-span-2">
            <dt className="label">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap text-ink-muted">{exercise.description ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="label">Scope notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-ink-muted">{exercise.scope_notes ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-ink">Move to status</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Manually set the engagement phase.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              disabled={updating || s === exercise.status}
              onClick={() => handleStatusChange(s)}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
                s === exercise.status
                  ? "border-accent-500/40 bg-accent-500/5 text-accent-200"
                  : "border-border bg-surface2 text-ink-muted hover:border-slate-600 hover:text-ink"
              }`}
            >
              <span>{s.replace(/_/g, " ")}</span>
              {s === exercise.status && (
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent-300">current</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
