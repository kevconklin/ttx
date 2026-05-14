"use client";

import { useCallback, useEffect, useState } from "react";
import { api, streamUrls } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useStreamGeneration } from "@/lib/hooks";
import StreamingPreview from "@/components/StreamingPreview";
import { RatingBadge, SeverityBadge, PriorityBadge } from "@/components/StatusBadge";
import type { AAR, Exercise } from "@/types";

interface Props {
  exercise: Exercise;
  onRefresh: () => Promise<void> | void;
}

export default function AARTab({ exercise, onRefresh }: Props) {
  const toast = useToast();
  const [aar, setAAR] = useState<AAR | null>(null);
  const [loading, setLoading] = useState(true);
  const [facilitatorNotes, setFacilitatorNotes] = useState("");
  const [participantFeedback, setParticipantFeedback] = useState("");
  const stream = useStreamGeneration();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAAR(exercise.id);
      setAAR(data);
      setFacilitatorNotes(data.facilitator_notes ?? "");
      setParticipantFeedback(data.participant_feedback ?? "");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [exercise.id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (stream.state === "done") {
      load();
      onRefresh();
      toast.success("AAR generated");
    }
    if (stream.state === "error" && stream.error) toast.error(stream.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.state]);

  const handleSaveNotes = async () => {
    try {
      await api.updateAAR(exercise.id, {
        facilitator_notes: facilitatorNotes,
        participant_feedback: participantFeedback,
      });
      toast.success("Notes saved");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleGenerate = async () => {
    await stream.generate(streamUrls.aar(), {
      exercise_id: exercise.id,
      facilitator_notes: facilitatorNotes || null,
      participant_feedback: participantFeedback || null,
    });
  };

  if (loading) return <div className="text-sm text-ink-muted">Loading…</div>;

  const hasContent = aar && (aar.executive_summary || aar.strengths?.length || aar.gaps_identified?.length);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-1">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-ink">Facilitator notes</h3>
          <p className="mt-1 text-xs text-ink-muted">Observations, key decisions, surprising moments.</p>
          <textarea
            className="textarea mt-3"
            rows={6}
            value={facilitatorNotes}
            onChange={(e) => setFacilitatorNotes(e.target.value)}
          />

          <h3 className="mt-5 text-sm font-semibold text-ink">Participant feedback</h3>
          <p className="mt-1 text-xs text-ink-muted">Survey themes, direct quotes, suggested follow-ups.</p>
          <textarea
            className="textarea mt-3"
            rows={5}
            value={participantFeedback}
            onChange={(e) => setParticipantFeedback(e.target.value)}
          />

          <div className="mt-5 flex flex-col gap-2">
            <button onClick={handleSaveNotes} className="btn-secondary">Save notes</button>
            <button
              onClick={handleGenerate}
              disabled={stream.state === "streaming"}
              className="btn-primary"
            >
              {stream.state === "streaming"
                ? "Generating AAR…"
                : hasContent
                  ? "Regenerate AAR"
                  : "Generate AAR"}
            </button>
            <a
              href={api.exportAARUrl(exercise.id)}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-secondary text-center ${hasContent ? "" : "pointer-events-none opacity-50"}`}
            >
              Export PDF
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <StreamingPreview text={stream.streamedText} state={stream.state} title="Streaming AAR" />

        {!hasContent && stream.state !== "streaming" && (
          <div className="card p-8 text-center text-sm text-ink-muted">
            No AAR yet. Add facilitator notes and participant feedback on the left,
            then click <span className="text-accent-300">Generate AAR</span>.
          </div>
        )}

        {aar && aar.executive_summary && (
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <div className="label">Executive summary</div>
              {aar.overall_rating && <RatingBadge rating={aar.overall_rating} />}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">
              {aar.executive_summary}
            </p>
          </section>
        )}

        {aar && aar.strengths && aar.strengths.length > 0 && (
          <section className="card p-6">
            <div className="label">Strengths</div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink marker:text-accent-400">
              {aar.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </section>
        )}

        {aar && aar.gaps_identified && aar.gaps_identified.length > 0 && (
          <section className="card p-6">
            <div className="label">Gaps identified</div>
            <ul className="mt-3 space-y-2 text-sm">
              {aar.gaps_identified.map((g, i) => (
                <li key={i} className="rounded-md border border-border bg-surface2/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-ink">{g.gap}</div>
                    <SeverityBadge severity={g.severity} />
                  </div>
                  {g.evidence && (
                    <p className="mt-1.5 text-xs text-ink-muted">{g.evidence}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {aar && aar.recommendations && aar.recommendations.length > 0 && (
          <section className="card p-6">
            <div className="label">Recommendations</div>
            <ul className="mt-3 space-y-2 text-sm">
              {aar.recommendations.map((r, i) => (
                <li key={i} className="rounded-md border border-border bg-surface2/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-ink">{r.recommendation}</div>
                    <PriorityBadge priority={r.priority} />
                  </div>
                  {r.rationale && (
                    <p className="mt-1.5 text-xs text-ink-muted">{r.rationale}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {aar && aar.action_items && aar.action_items.length > 0 && (
          <section className="card p-6">
            <div className="label">Action items</div>
            <table className="mt-3 min-w-full text-sm">
              <thead>
                <tr className="border-b border-divider">
                  <th className="py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Item</th>
                  <th className="py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Owner</th>
                  <th className="py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Priority</th>
                  <th className="py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Due</th>
                </tr>
              </thead>
              <tbody>
                {aar.action_items.map((a, i) => (
                  <tr key={i} className="border-b border-divider/60">
                    <td className="py-2 pr-3 align-top text-ink">{a.item}</td>
                    <td className="py-2 pr-3 align-top text-ink-muted">{a.owner ?? "—"}</td>
                    <td className="py-2 pr-3 align-top"><PriorityBadge priority={a.priority} /></td>
                    <td className="py-2 align-top font-mono text-xs text-ink-muted">{a.due_date ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
