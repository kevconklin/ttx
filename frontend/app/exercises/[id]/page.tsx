"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { ExerciseStatusBadge } from "@/components/StatusBadge";
import Breadcrumb from "@/components/Breadcrumb";
import StatusTimeline from "@/components/StatusTimeline";
import OverviewTab from "./_tabs/OverviewTab";
import ScenariosTab from "./_tabs/ScenariosTab";
import PlanTab from "./_tabs/PlanTab";
import AARTab from "./_tabs/AARTab";
import type { Client, Exercise } from "@/types";

type TabKey = "overview" | "scenarios" | "plan" | "aar";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "scenarios", label: "Scenarios" },
  { key: "plan", label: "Exercise Plan" },
  { key: "aar", label: "After Action Report" },
];

export default function ExerciseDetailPage() {
  const params = useParams<{ id: string }>();
  const exerciseId = params.id;
  const toast = useToast();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const ex = await api.getExercise(exerciseId);
      setExercise(ex);
      const cl = await api.getClient(ex.client_id);
      setClient(cl);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [exerciseId, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) return <div className="text-sm text-ink-muted">Loading…</div>;
  if (!exercise || !client) return <div className="text-sm text-ink-muted">Exercise not found.</div>;

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "Exercises", href: "/exercises" },
          { label: client.name },
        ]}
      />

      <div>
        <div className="label">{client.name}{client.industry ? ` · ${client.industry}` : ""}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
          {exercise.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <ExerciseStatusBadge status={exercise.status} />
          <span className="inline-flex items-center rounded border border-border bg-surface2 px-2 py-0.5 text-[11px] text-ink-muted">
            {exercise.exercise_type.replace(/_/g, " ")}
          </span>
          {exercise.scheduled_date && (
            <span className="font-mono text-xs text-ink-muted">
              {exercise.scheduled_date}
            </span>
          )}
        </div>
      </div>

      <div className="card p-6">
        <StatusTimeline current={exercise.status} />
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative pb-3 text-sm font-medium transition ${
                tab === t.key
                  ? "text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent-500" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {tab === "overview" && <OverviewTab exercise={exercise} client={client} onRefresh={refresh} />}
        {tab === "scenarios" && <ScenariosTab exercise={exercise} onRefresh={refresh} />}
        {tab === "plan" && <PlanTab exercise={exercise} onRefresh={refresh} />}
        {tab === "aar" && <AARTab exercise={exercise} onRefresh={refresh} />}
      </div>
    </div>
  );
}
