"use client";

import { useCallback, useEffect, useState } from "react";
import { api, streamUrls } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useStreamGeneration } from "@/lib/hooks";
import StreamingPreview from "@/components/StreamingPreview";
import { ScenarioStatusBadge } from "@/components/StatusBadge";
import type { Exercise, Scenario, ScenarioStatus } from "@/types";

interface Props {
  exercise: Exercise;
  onRefresh: () => Promise<void> | void;
}

export default function ScenariosTab({ exercise, onRefresh }: Props) {
  const toast = useToast();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeInjectScenarioId, setActiveInjectScenarioId] = useState<string | null>(null);

  const scenariosStream = useStreamGeneration();
  const injectsStream = useStreamGeneration();

  const load = useCallback(async () => {
    try {
      const list = await api.listScenarios(exercise.id);
      setScenarios(list);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [exercise.id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (scenariosStream.state === "done") {
      load();
      onRefresh();
      toast.success("New scenarios generated");
    }
    if (scenariosStream.state === "error" && scenariosStream.error) {
      toast.error(scenariosStream.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenariosStream.state]);

  useEffect(() => {
    if (injectsStream.state === "done") {
      load();
      toast.success("Additional injects appended");
      setActiveInjectScenarioId(null);
    }
    if (injectsStream.state === "error" && injectsStream.error) {
      toast.error(injectsStream.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectsStream.state]);

  const handleStatus = async (id: string, status: ScenarioStatus) => {
    try {
      await api.updateScenarioStatus(id, status);
      await load();
      toast.success(`Marked as ${status}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleGenerateMore = async () => {
    await scenariosStream.generate(streamUrls.scenarios(), {
      exercise_id: exercise.id,
      count: 2,
    });
  };

  const handleAdditionalInjects = async (scenarioId: string) => {
    setActiveInjectScenarioId(scenarioId);
    await injectsStream.generate(streamUrls.scenarioInjects(scenarioId), {
      additional_count: 2,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Scenarios</h2>
            <p className="text-xs text-ink-muted">
              Approve, reject, or expand the AI-generated scenarios.
            </p>
          </div>
          <button
            onClick={handleGenerateMore}
            disabled={scenariosStream.state === "streaming"}
            className="btn-primary"
          >
            {scenariosStream.state === "streaming" ? "Generating…" : "Generate more"}
          </button>
        </div>

        {scenarios.length === 0 && scenariosStream.state !== "streaming" && (
          <div className="card p-8 text-center text-sm text-ink-muted">
            No scenarios yet. Click <span className="text-accent-300">Generate more</span> to create some.
          </div>
        )}

        <div className="space-y-3">
          {scenarios.map((s) => {
            const isOpen = expandedId === s.id;
            return (
              <div key={s.id} className={`card-accent ${isOpen ? "card-active" : ""} overflow-hidden`}>
                <div className="flex items-start justify-between gap-3 p-5">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : s.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <ScenarioStatusBadge status={s.status} />
                      <h3 className="text-base font-semibold text-ink">{s.title}</h3>
                    </div>
                    {s.description && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">{s.description}</p>
                    )}
                  </button>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleStatus(s.id, "approved")}
                      className="btn-secondary text-xs"
                      disabled={s.status === "approved"}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatus(s.id, "rejected")}
                      className="btn-secondary text-xs"
                      disabled={s.status === "rejected"}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : s.id)}
                      className="grid h-8 w-8 place-items-center rounded text-ink-muted transition hover:bg-surface2 hover:text-ink"
                    >
                      <svg viewBox="0 0 20 20" className={`h-4 w-4 fill-current transition ${isOpen ? "rotate-180" : ""}`}>
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-surface2/40 p-5 text-sm">
                    {s.description && (
                      <div className="mb-5">
                        <div className="label">Description</div>
                        <p className="mt-1.5 whitespace-pre-wrap text-ink-muted">{s.description}</p>
                      </div>
                    )}

                    {s.inject_sequence && s.inject_sequence.length > 0 && (
                      <div className="mb-5">
                        <div className="label">Inject sequence</div>
                        <ol className="mt-3 space-y-4">
                          {s.inject_sequence.map((step, i) => (
                            <li key={i} className="flex gap-4">
                              <div className="w-20 shrink-0 pt-0.5 font-mono text-xs text-accent-300">
                                {step.time_offset}
                              </div>
                              <div className="relative flex-1">
                                {s.inject_sequence && i < s.inject_sequence.length - 1 && (
                                  <span className="absolute left-0 top-3 h-full w-px bg-divider" aria-hidden />
                                )}
                                <span className="absolute -left-[3px] top-1.5 h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden />
                                <div className="pl-4">
                                  <p className="text-ink">{step.inject}</p>
                                  {step.facilitator_note && (
                                    <p className="mt-1 text-xs italic text-ink-dim">
                                      <span className="font-mono not-italic">facilitator:</span>{" "}
                                      {step.facilitator_note}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                      {s.discussion_questions && s.discussion_questions.length > 0 && (
                        <div>
                          <div className="label">Discussion</div>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted marker:text-ink-dim">
                            {s.discussion_questions.map((q, i) => <li key={i}>{q}</li>)}
                          </ul>
                        </div>
                      )}
                      {s.expected_actions && s.expected_actions.length > 0 && (
                        <div>
                          <div className="label">Expected actions</div>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted marker:text-accent-400">
                            {s.expected_actions.map((q, i) => <li key={i}>{q}</li>)}
                          </ul>
                        </div>
                      )}
                      {s.common_pitfalls && s.common_pitfalls.length > 0 && (
                        <div>
                          <div className="label">Common pitfalls</div>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted marker:text-amber-400">
                            {s.common_pitfalls.map((q, i) => <li key={i}>{q}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex items-center gap-2">
                      <button
                        onClick={() => handleAdditionalInjects(s.id)}
                        disabled={injectsStream.state === "streaming" && activeInjectScenarioId === s.id}
                        className="btn-secondary"
                      >
                        {injectsStream.state === "streaming" && activeInjectScenarioId === s.id
                          ? "Generating injects…"
                          : "Generate additional injects"}
                      </button>
                    </div>

                    {activeInjectScenarioId === s.id && (
                      <StreamingPreview
                        text={injectsStream.streamedText}
                        state={injectsStream.state}
                        title="Streaming additional injects"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="label">AI Generation</div>
        <div className="mt-2">
          <StreamingPreview
            text={scenariosStream.streamedText}
            state={scenariosStream.state}
            title="Scenarios stream"
          />
          {scenariosStream.state === "idle" && (
            <div className="card mt-2 p-4 text-xs text-ink-dim">
              Console will activate when scenario generation is in progress.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
