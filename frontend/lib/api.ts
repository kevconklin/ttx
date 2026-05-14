/**
 * Thin client around the FastAPI backend.
 *
 * All routes are protected by the backend's `get_current_user` stub. Once real
 * JWT auth is wired in, attach the token via the `Authorization` header here.
 */

import type {
  AAR,
  Client,
  ClientSystem,
  Exercise,
  ExercisePlan,
  ExerciseStatus,
  Scenario,
  ScenarioStatus,
} from "@/types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    let code: string | undefined;
    try {
      const data = await res.json();
      if (data?.detail) detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      if (data?.code) code = data.code;
    } catch {
      /* swallow */
    }
    throw new ApiError(detail, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Clients ---------------------------------------------------------------

export const api = {
  // clients
  listClients: () => request<Client[]>("/clients"),
  getClient: (id: string) => request<Client>(`/clients/${id}`),
  createClient: (payload: Partial<Client>) =>
    request<Client>("/clients", { method: "POST", body: JSON.stringify(payload) }),
  updateClient: (id: string, payload: Partial<Client>) =>
    request<Client>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteClient: (id: string) =>
    request<void>(`/clients/${id}`, { method: "DELETE" }),

  // client systems
  listClientSystems: (clientId: string) =>
    request<ClientSystem[]>(`/clients/${clientId}/systems`),
  createClientSystem: (clientId: string, payload: Partial<ClientSystem>) =>
    request<ClientSystem>(`/clients/${clientId}/systems`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateClientSystem: (
    clientId: string,
    systemId: string,
    payload: Partial<ClientSystem>,
  ) =>
    request<ClientSystem>(`/clients/${clientId}/systems/${systemId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteClientSystem: (clientId: string, systemId: string) =>
    request<void>(`/clients/${clientId}/systems/${systemId}`, { method: "DELETE" }),

  // exercises
  listExercises: (params?: { status?: ExerciseStatus; client_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.client_id) qs.set("client_id", params.client_id);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<Exercise[]>(`/exercises${suffix}`);
  },
  getExercise: (id: string) => request<Exercise>(`/exercises/${id}`),
  createExercise: (payload: Partial<Exercise>) =>
    request<Exercise>("/exercises", { method: "POST", body: JSON.stringify(payload) }),
  updateExercise: (id: string, payload: Partial<Exercise>) =>
    request<Exercise>(`/exercises/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  updateExerciseStatus: (id: string, status: ExerciseStatus) =>
    request<Exercise>(`/exercises/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // scenarios
  listScenarios: (exerciseId: string) =>
    request<Scenario[]>(`/exercises/${exerciseId}/scenarios`),
  updateScenario: (id: string, payload: Partial<Scenario>) =>
    request<Scenario>(`/scenarios/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  updateScenarioStatus: (id: string, status: ScenarioStatus, clientNotes?: string) =>
    request<Scenario>(`/scenarios/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, client_notes: clientNotes ?? null }),
    }),

  // exercise plan
  getPlan: (exerciseId: string) =>
    request<ExercisePlan>(`/exercises/${exerciseId}/plan`).catch((err) => {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }),
  updatePlan: (exerciseId: string, payload: Partial<ExercisePlan>) =>
    request<ExercisePlan>(`/exercises/${exerciseId}/plan`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // AAR
  getAAR: (exerciseId: string) =>
    request<AAR>(`/exercises/${exerciseId}/aar`),
  updateAAR: (exerciseId: string, payload: Partial<AAR>) =>
    request<AAR>(`/exercises/${exerciseId}/aar`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  exportAARUrl: (exerciseId: string) =>
    `${API_BASE}/exercises/${exerciseId}/aar/export`,
};

// --- streaming endpoints (URL helpers) ------------------------------------

export const streamUrls = {
  scenarios: () => `${API_BASE}/generate/scenarios/stream`,
  exercisePlan: () => `${API_BASE}/generate/exercise-plan/stream`,
  aar: () => `${API_BASE}/generate/aar/stream`,
  scenarioInjects: (scenarioId: string) =>
    `${API_BASE}/generate/scenario-injects/${scenarioId}/stream`,
};
