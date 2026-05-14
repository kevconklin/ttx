"use client";

import { useCallback, useEffect, useState } from "react";
import { api, streamUrls } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useStreamGeneration } from "@/lib/hooks";
import StreamingPreview from "@/components/StreamingPreview";
import type { Exercise, ExercisePlan } from "@/types";

interface Props {
  exercise: Exercise;
  onRefresh: () => Promise<void> | void;
}

export default function PlanTab({ exercise, onRefresh }: Props) {
  const toast = useToast();
  const [plan, setPlan] = useState<ExercisePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [logistics, setLogistics] = useState("");
  const stream = useStreamGeneration();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await api.getPlan(exercise.id);
      setPlan(p);
      setLogistics(p?.logistics_notes ?? "");
    } finally {
      setLoading(false);
    }
  }, [exercise.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (stream.state === "done") {
      load();
      toast.success("Plan generated");
    }
    if (stream.state === "error" && stream.error) toast.error(stream.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.state]);

  const handleGenerate = async () => {
    await stream.generate(streamUrls.exercisePlan(), { exercise_id: exercise.id });
  };

  const handleSaveLogistics = async () => {
    try {
      await api.updatePlan(exercise.id, { logistics_notes: logistics });
      toast.success("Logistics notes saved");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleMarkSent = async () => {
    try {
      await api.updatePlan(exercise.id, { status: "sent" });
      await api.updateExerciseStatus(exercise.id, "sent_for_review");
      toast.success("Plan marked as sent to client");
      await load();
      await onRefresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (loading) return <div className="text-sm text-ink-muted">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Exercise plan</h2>
          <p className="text-xs text-ink-muted">
            Objectives, ground rules, agenda, debrief structure.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={stream.state === "streaming"}
            className="btn-primary"
          >
            {plan
              ? stream.state === "streaming"
                ? "Regenerating…"
                : "Regenerate plan"
              : stream.state === "streaming"
                ? "Generating…"
                : "Generate plan"}
          </button>
          {plan && plan.status !== "sent" && plan.status !== "approved" && (
            <button onClick={handleMarkSent} className="btn-secondary">
              Mark as sent to client
            </button>
          )}
        </div>
      </div>

      <StreamingPreview text={stream.streamedText} state={stream.state} title="Streaming plan" />

      {!plan && stream.state !== "streaming" && (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No plan yet. Click <span className="text-accent-300">Generate plan</span> to create one based on the approved scenarios.
        </div>
      )}

      {plan && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2">
            {plan.objectives && plan.objectives.length > 0 && (
              <section className="mb-6">
                <div className="label">Objectives</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink marker:text-accent-400">
                  {plan.objectives.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </section>
            )}

            {plan.ground_rules && plan.ground_rules.length > 0 && (
              <section className="mb-6">
                <div className="label">Ground rules</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted marker:text-ink-dim">
                  {plan.ground_rules.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </section>
            )}

            {plan.agenda && plan.agenda.length > 0 && (
              <section className="mb-6">
                <div className="label">Agenda</div>
                <table className="mt-2 min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-divider">
                      <th className="py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Time</th>
                      <th className="py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Item</th>
                      <th className="py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Owner</th>
                      <th className="py-1.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Min</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.agenda.map((a, i) => (
                      <tr key={i} className="border-b border-divider/60">
                        <td className="py-2 pr-3 align-top font-mono text-xs text-accent-300">{a.time}</td>
                        <td className="py-2 pr-3 align-top text-ink">{a.item}</td>
                        <td className="py-2 pr-3 align-top text-ink-muted">{a.owner ?? "—"}</td>
                        <td className="py-2 text-right align-top font-mono text-xs text-ink-muted">{a.duration_min}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {plan.roles && plan.roles.length > 0 && (
              <section className="mb-6">
                <div className="label">Roles</div>
                <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                  {plan.roles.map((r, i) => (
                    <li key={i}>
                      <span className="font-semibold text-ink">{r.role}:</span> {r.responsibilities}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {plan.materials_needed && plan.materials_needed.length > 0 && (
              <section className="mb-6">
                <div className="label">Materials needed</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                  {plan.materials_needed.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </section>
            )}

            {plan.debrief_structure && (
              <section>
                <div className="label">Debrief structure</div>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface2 p-3 font-mono text-[11.5px] text-ink/90">
                  {JSON.stringify(plan.debrief_structure, null, 2)}
                </pre>
              </section>
            )}
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-ink">Logistics notes</h3>
            <p className="mt-1 text-xs text-ink-muted">Venue, AV, dial-in, dietary, etc.</p>
            <textarea
              className="textarea mt-3"
              rows={6}
              value={logistics}
              onChange={(e) => setLogistics(e.target.value)}
            />
            <button onClick={handleSaveLogistics} className="btn-secondary mt-2 w-full">
              Save notes
            </button>
            <div className="mt-5 flex items-center justify-between rounded-md border border-border bg-surface2 px-3 py-2 text-xs text-ink-muted">
              <span>Plan status</span>
              <span className="font-mono uppercase tracking-wider text-accent-300">{plan.status}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
