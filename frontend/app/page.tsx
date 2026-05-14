"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { ExerciseStatusBadge } from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import type { Client, Exercise } from "@/types";

export default function DashboardPage() {
  const toast = useToast();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
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

  const now = new Date();
  const thisMonth = exercises.filter((e) => {
    const d = new Date(e.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const active = exercises.filter((e) => e.status !== "completed");
  const pendingReview = exercises.filter((e) => e.status === "sent_for_review");

  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="space-y-10">
      {/* Hero header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="label">Console</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Active engagements, pending reviews, and recent activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/clients" className="btn-secondary">View Clients</Link>
          <Link href="/exercises/new" className="btn-primary">New Exercise</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Exercises" value={active.length} />
        <StatCard label="This Month" value={thisMonth.length} />
        <StatCard label="Clients" value={clients.length} />
        <StatCard label="Pending Reviews" value={pendingReview.length} />
      </div>

      {/* Recent Exercises */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Recent Exercises
          </h2>
          <Link
            href="/exercises"
            className="text-xs font-medium text-accent-300 transition hover:text-accent-200"
          >
            View all →
          </Link>
        </div>
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-ink-muted">Loading…</div>
          ) : exercises.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-muted">
              No exercises yet.{" "}
              <Link href="/exercises/new" className="text-accent-300 underline-offset-4 hover:underline">
                Create your first exercise
              </Link>
              .
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
                {exercises.slice(0, 8).map((ex) => (
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
                    <td>
                      <ExerciseStatusBadge status={ex.status} />
                    </td>
                    <td className="font-mono text-xs text-ink-muted">
                      {ex.scheduled_date ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
