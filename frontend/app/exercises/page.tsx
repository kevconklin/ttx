"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { ExerciseStatusBadge } from "@/components/StatusBadge";
import type { Client, Exercise, ExerciseStatus } from "@/types";

const STATUS_OPTIONS: { value: ExerciseStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "scoping", label: "Scoping" },
  { value: "scenarios_generated", label: "Scenarios" },
  { value: "sent_for_review", label: "Sent for Review" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export default function ExerciseListPage() {
  const toast = useToast();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [statusFilter, setStatusFilter] = useState<ExerciseStatus | "all">("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listExercises(), api.listClients()])
      .then(([ex, cl]) => {
        setExercises(ex);
        setClients(cl);
      })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, [toast]);

  const clientName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) map.set(c.id, c.name);
    return (id: string) => map.get(id) ?? id;
  }, [clients]);

  const filtered = exercises.filter(
    (e) =>
      (statusFilter === "all" || e.status === statusFilter) &&
      (clientFilter === "all" || e.client_id === clientFilter),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="label">Engagements</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Exercises
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Scope, generate, deliver, and report.
          </p>
        </div>
        <Link href="/exercises/new" className="btn-primary">New Exercise</Link>
      </div>

      {/* Filter chips */}
      <div className="card flex flex-wrap items-end gap-4 p-4">
        <div>
          <label className="label">Status</label>
          <div className="mt-2 flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === opt.value
                    ? "bg-accent-500/15 text-accent-200 ring-1 ring-inset ring-accent-500/40"
                    : "bg-surface2 text-ink-muted ring-1 ring-inset ring-border hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-[200px]">
          <label className="label">Client</label>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="select"
          >
            <option value="all">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-ink-muted">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            No exercises match these filters.
          </div>
        ) : (
          <table className="table-dark">
            <thead>
              <tr>
                <th>Title</th>
                <th>Client</th>
                <th>Type</th>
                <th>Status</th>
                <th>Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ex) => (
                <tr key={ex.id}>
                  <td>
                    <Link
                      href={`/exercises/${ex.id}`}
                      className="font-medium text-ink transition hover:text-accent-200"
                    >
                      {ex.title}
                    </Link>
                  </td>
                  <td className="text-ink-muted">{clientName(ex.client_id)}</td>
                  <td>
                    <span className="inline-flex items-center rounded border border-border bg-surface2 px-2 py-0.5 text-[11px] text-ink-muted">
                      {ex.exercise_type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td><ExerciseStatusBadge status={ex.status} /></td>
                  <td className="font-mono text-xs text-ink-muted">
                    {ex.scheduled_date ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
