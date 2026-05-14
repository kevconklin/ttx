"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import type { Client, ClientSystem, Exercise } from "@/types";

interface ClientRow {
  client: Client;
  systemCount: number;
  exerciseCount: number;
  systems: ClientSystem[];
  exercises: Exercise[];
}

export default function ClientsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", industry: "", contact_email: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [clients, exercises] = await Promise.all([api.listClients(), api.listExercises()]);
      const systemsPerClient = await Promise.all(
        clients.map((c) => api.listClientSystems(c.id).catch(() => [] as ClientSystem[])),
      );
      const composed: ClientRow[] = clients.map((c, i) => {
        const systems = systemsPerClient[i] ?? [];
        const exs = exercises.filter((e) => e.client_id === c.id);
        return {
          client: c,
          systems,
          exercises: exs,
          systemCount: systems.length,
          exerciseCount: exs.length,
        };
      });
      setRows(composed);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createClient({
        name: form.name,
        industry: form.industry || null,
        contact_email: form.contact_email || null,
      });
      setForm({ name: "", industry: "", contact_email: "" });
      toast.success("Client created");
      await loadAll();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="label">Roster</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Clients</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Manage client roster and known systems used during scenario generation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={handleCreate} className="card p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-ink">Add client</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Stored locally — used to scope exercises and tailor scenarios.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="label">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="Northwind Health Systems"
              />
            </div>
            <div>
              <label className="label">Industry</label>
              <input
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                className="input"
                placeholder="Healthcare"
              />
            </div>
            <div>
              <label className="label">Contact email</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                className="input"
                placeholder="ciso@client.example"
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Creating…" : "Create client"}
            </button>
          </div>
        </form>

        <div className="card overflow-hidden lg:col-span-2">
          {loading ? (
            <div className="p-6 text-sm text-ink-muted">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-muted">
              No clients yet. Add one on the left.
            </div>
          ) : (
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Industry</th>
                  <th className="text-right">Systems</th>
                  <th className="text-right">Exercises</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isOpen = expanded === row.client.id;
                  return (
                    <Fragment key={row.client.id}>
                      <tr
                        onClick={() => setExpanded(isOpen ? null : row.client.id)}
                        className="cursor-pointer"
                      >
                        <td className="font-medium text-ink">{row.client.name}</td>
                        <td className="text-ink-muted">{row.client.industry ?? "—"}</td>
                        <td className="text-right font-mono text-xs text-ink-muted">
                          {row.systemCount}
                        </td>
                        <td className="text-right font-mono text-xs text-ink-muted">
                          {row.exerciseCount}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-surface2/40">
                          <td colSpan={4} className="!border-t-0 p-5">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                              <div>
                                <div className="label">Known Systems</div>
                                {row.systems.length === 0 ? (
                                  <p className="mt-2 text-xs text-ink-dim">
                                    No systems recorded for this client.
                                  </p>
                                ) : (
                                  <ul className="mt-3 space-y-2">
                                    {row.systems.map((s) => (
                                      <li
                                        key={s.id}
                                        className="rounded border border-border bg-surface p-3 text-sm"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="font-medium text-ink">{s.name}</div>
                                          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                                            {s.system_type} · {s.criticality}
                                          </span>
                                        </div>
                                        <div className="mt-1 font-mono text-[11px] text-ink-muted">
                                          {s.hostname && <>host: {s.hostname}</>}
                                          {s.hostname && s.ip_address && " · "}
                                          {s.ip_address && <>ip: {s.ip_address}</>}
                                          {!s.hostname && !s.ip_address && "—"}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div>
                                <div className="label">Exercise History</div>
                                {row.exercises.length === 0 ? (
                                  <p className="mt-2 text-xs text-ink-dim">No exercises.</p>
                                ) : (
                                  <ul className="mt-3 space-y-1.5 text-sm">
                                    {row.exercises.map((e) => (
                                      <li key={e.id} className="flex items-center justify-between gap-3">
                                        <Link
                                          href={`/exercises/${e.id}`}
                                          className="truncate text-ink transition hover:text-accent-200"
                                        >
                                          {e.title}
                                        </Link>
                                        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                                          {e.status.replace(/_/g, " ")}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
