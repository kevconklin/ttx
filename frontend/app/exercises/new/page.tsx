"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, streamUrls } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useStreamGeneration } from "@/lib/hooks";
import StreamingPreview from "@/components/StreamingPreview";
import type {
  Client,
  ClientSystem,
  Criticality,
  Exercise,
  ExerciseType,
  SystemType,
} from "@/types";

const EXERCISE_TYPES: { value: ExerciseType; label: string }[] = [
  { value: "backup_recovery", label: "Backup & Recovery" },
  { value: "incident_response", label: "Incident Response" },
  { value: "ransomware", label: "Ransomware" },
  { value: "data_breach", label: "Data Breach" },
  { value: "business_continuity", label: "Business Continuity" },
  { value: "custom", label: "Custom" },
];

const SYSTEM_TYPES: SystemType[] = [
  "server", "database", "network_device", "endpoint", "cloud", "other",
];
const CRITICALITIES: Criticality[] = ["critical", "high", "medium", "low"];

type Step = 1 | 2 | 3 | 4;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Client" },
  { n: 2, label: "Scope" },
  { n: 3, label: "Systems" },
  { n: 4, label: "Generate" },
];

interface DraftSystem {
  system_type: SystemType;
  name: string;
  ip_address: string;
  hostname: string;
  description: string;
  criticality: Criticality;
}

const emptySystem: DraftSystem = {
  system_type: "server",
  name: "",
  ip_address: "",
  hostname: "",
  description: "",
  criticality: "medium",
};

export default function NewExerciseWizardPage() {
  const router = useRouter();
  const toast = useToast();
  const stream = useStreamGeneration<{ scenario_ids: string[]; count: number }>();

  const [step, setStep] = useState<Step>(1);
  const [clients, setClients] = useState<Client[]>([]);

  const [clientId, setClientId] = useState<string>("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", industry: "", contact_email: "" });

  const [scope, setScope] = useState({
    title: "",
    description: "",
    exercise_type: "incident_response" as ExerciseType,
    scheduled_date: "",
    scope_notes: "",
  });

  const [hasSystems, setHasSystems] = useState<boolean | null>(null);
  const [systems, setSystems] = useState<DraftSystem[]>([]);

  const [createdExercise, setCreatedExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    api.listClients().then(setClients).catch((e) => toast.error((e as Error).message));
  }, [toast]);

  const canProceed = useMemo(() => {
    if (step === 1) return clientId !== "";
    if (step === 2) return scope.title.trim().length > 0;
    if (step === 3) return hasSystems !== null;
    return true;
  }, [step, clientId, scope.title, hasSystems]);

  const handleCreateClient = async () => {
    if (!newClient.name) return;
    try {
      const c = await api.createClient({
        name: newClient.name,
        industry: newClient.industry || null,
        contact_email: newClient.contact_email || null,
      });
      setClients((prev) => [c, ...prev]);
      setClientId(c.id);
      setCreatingClient(false);
      setNewClient({ name: "", industry: "", contact_email: "" });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleStep3Next = async () => {
    if (hasSystems === true && systems.length > 0) {
      try {
        for (const s of systems) {
          const payload: Partial<ClientSystem> = {
            system_type: s.system_type,
            name: s.name,
            ip_address: s.ip_address || null,
            hostname: s.hostname || null,
            description: s.description || null,
            criticality: s.criticality,
          };
          await api.createClientSystem(clientId, payload);
        }
        toast.success(`Saved ${systems.length} system(s) for client`);
      } catch (err) {
        toast.error((err as Error).message);
        return;
      }
    }
    setStep(4);
  };

  const handleCreateExerciseAndGenerate = async () => {
    try {
      const exercise = await api.createExercise({
        client_id: clientId,
        title: scope.title,
        description: scope.description || null,
        exercise_type: scope.exercise_type,
        scope_notes: scope.scope_notes || null,
        has_client_systems: hasSystems === true,
        scheduled_date: scope.scheduled_date || null,
      });
      setCreatedExercise(exercise);
      await stream.generate(streamUrls.scenarios(), {
        exercise_id: exercise.id,
        count: 2,
      });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  useEffect(() => {
    if (stream.state === "done" && createdExercise) {
      toast.success("Scenarios generated");
      router.push(`/exercises/${createdExercise.id}`);
    }
    if (stream.state === "error" && stream.error) {
      toast.error(stream.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.state]);

  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="label">Setup</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
          New Exercise
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Scope an engagement and generate tailored scenarios in seconds.
        </p>
      </div>

      {/* Step indicator */}
      <ol className="flex items-center">
        {STEPS.map((s, i) => {
          const isCompleted = i < step - 1;
          const isCurrent = s.n === step;
          return (
            <li key={s.n} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-medium transition ${
                    isCompleted
                      ? "border-accent-500 bg-accent-500 text-bg"
                      : isCurrent
                        ? "border-accent-500 bg-surface text-accent-200 shadow-glow-emerald"
                        : "border-border bg-surface text-ink-dim"
                  }`}
                >
                  {isCompleted ? (
                    <svg viewBox="0 0 20 20" className="h-3 w-3 fill-current">
                      <path d="M16.704 5.296a1 1 0 010 1.408l-7.5 7.5a1 1 0 01-1.408 0l-3.5-3.5a1 1 0 111.408-1.408L8.5 12.092l6.796-6.796a1 1 0 011.408 0z" />
                    </svg>
                  ) : (
                    s.n
                  )}
                </span>
                <span className={`text-xs font-medium ${isCurrent ? "text-ink" : "text-ink-dim"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className={`mx-3 h-px flex-1 ${
                    i < step - 1 ? "bg-accent-500/60" : "bg-divider"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="card p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-ink">Select a client</h2>
            <div>
              <label className="label">Existing client</label>
              <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Choose a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {!creatingClient ? (
              <button
                type="button"
                onClick={() => setCreatingClient(true)}
                className="text-sm text-accent-300 transition hover:text-accent-200"
              >
                + Quick-create new client
              </button>
            ) : (
              <div className="rounded-md border border-border bg-surface2 p-4">
                <h3 className="text-sm font-semibold text-ink">New client</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label">Name</label>
                    <input
                      value={newClient.name}
                      onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Industry</label>
                    <input
                      value={newClient.industry}
                      onChange={(e) => setNewClient((c) => ({ ...c, industry: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Contact email</label>
                    <input
                      type="email"
                      value={newClient.contact_email}
                      onChange={(e) => setNewClient((c) => ({ ...c, contact_email: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={handleCreateClient} className="btn-primary">Create</button>
                  <button onClick={() => setCreatingClient(false)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-ink">Scope the exercise</h2>
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={scope.title}
                onChange={(e) => setScope((s) => ({ ...s, title: e.target.value }))}
                placeholder="Q2 Ransomware Tabletop"
              />
            </div>
            <div>
              <label className="label">Exercise type</label>
              <select
                className="select"
                value={scope.exercise_type}
                onChange={(e) => setScope((s) => ({ ...s, exercise_type: e.target.value as ExerciseType }))}
              >
                {EXERCISE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="textarea"
                value={scope.description}
                onChange={(e) => setScope((s) => ({ ...s, description: e.target.value }))}
                placeholder="What does the client want to test?"
              />
            </div>
            <div>
              <label className="label">Scheduled date</label>
              <input
                type="date"
                className="input"
                value={scope.scheduled_date}
                onChange={(e) => setScope((s) => ({ ...s, scheduled_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Scope notes</label>
              <textarea
                className="textarea"
                value={scope.scope_notes}
                onChange={(e) => setScope((s) => ({ ...s, scope_notes: e.target.value }))}
                placeholder="Threat actors of interest, regulatory drivers, participant seniority, etc."
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-ink">
              Do you know the client&apos;s internal systems?
            </h2>
            <p className="text-sm text-ink-muted">
              When systems are known, injects will reference real hostnames, IPs, and
              databases. Otherwise the AI uses plausible generic placeholders.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setHasSystems(true);
                  if (systems.length === 0) setSystems([{ ...emptySystem }]);
                }}
                className={hasSystems === true ? "btn-primary" : "btn-secondary"}
              >
                Yes, I have system info
              </button>
              <button
                onClick={() => { setHasSystems(false); setSystems([]); }}
                className={hasSystems === false ? "btn-primary" : "btn-secondary"}
              >
                No, use generic placeholders
              </button>
            </div>

            {hasSystems && (
              <div className="mt-4 space-y-3">
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-surface2">
                      <tr>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Type</th>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Name</th>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Hostname</th>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">IP</th>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Criticality</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider">
                      {systems.map((s, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1.5">
                            <select
                              value={s.system_type}
                              onChange={(e) => setSystems((prev) => prev.map((p, i) => i === idx ? { ...p, system_type: e.target.value as SystemType } : p))}
                              className="select py-1 text-xs"
                            >
                              {SYSTEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              value={s.name}
                              onChange={(e) => setSystems((prev) => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                              className="input py-1 text-xs"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              value={s.hostname}
                              onChange={(e) => setSystems((prev) => prev.map((p, i) => i === idx ? { ...p, hostname: e.target.value } : p))}
                              className="input py-1 font-mono text-xs"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              value={s.ip_address}
                              onChange={(e) => setSystems((prev) => prev.map((p, i) => i === idx ? { ...p, ip_address: e.target.value } : p))}
                              className="input py-1 font-mono text-xs"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={s.criticality}
                              onChange={(e) => setSystems((prev) => prev.map((p, i) => i === idx ? { ...p, criticality: e.target.value as Criticality } : p))}
                              className="select py-1 text-xs"
                            >
                              {CRITICALITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <button
                              onClick={() => setSystems((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-xs text-red-300 transition hover:text-red-200"
                              type="button"
                            >
                              remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={() => setSystems((prev) => [...prev, { ...emptySystem }])}
                  className="btn-secondary"
                >
                  + Add system
                </button>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-ink">Review &amp; generate</h2>
            <div className="rounded-md border border-border bg-surface2 p-4 text-sm">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><dt className="label">Client</dt><dd className="mt-1 text-ink">{selectedClient?.name ?? "—"}</dd></div>
                <div><dt className="label">Type</dt><dd className="mt-1 text-ink">{scope.exercise_type.replace(/_/g, " ")}</dd></div>
                <div className="sm:col-span-2"><dt className="label">Title</dt><dd className="mt-1 text-ink">{scope.title}</dd></div>
                <div><dt className="label">Scheduled</dt><dd className="mt-1 font-mono text-xs text-ink">{scope.scheduled_date || "—"}</dd></div>
                <div><dt className="label">Systems known</dt><dd className="mt-1 text-ink">{hasSystems ? `Yes (${systems.length})` : "No"}</dd></div>
                {scope.scope_notes && (
                  <div className="sm:col-span-2">
                    <dt className="label">Scope notes</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-ink-muted">{scope.scope_notes}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateExerciseAndGenerate}
                disabled={stream.state === "streaming"}
                className="btn-primary"
              >
                {stream.state === "streaming"
                  ? "Generating scenarios…"
                  : "Create exercise & generate scenarios"}
              </button>
              {stream.state === "streaming" && (
                <button onClick={stream.abort} className="btn-secondary">Cancel</button>
              )}
            </div>
            <StreamingPreview
              text={stream.streamedText}
              state={stream.state}
              title="Streaming scenarios from Claude"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
          disabled={step === 1}
          className="btn-secondary"
        >
          Back
        </button>
        {step < 4 ? (
          <button
            onClick={() => {
              if (step === 3) return handleStep3Next();
              setStep((s) => (s + 1) as Step);
            }}
            disabled={!canProceed}
            className="btn-primary"
          >
            Continue
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
