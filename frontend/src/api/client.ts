import type {
  Hook,
  Event,
  Replay,
  ListEventsResponse,
  CreateHookRequest,
  UpdateHookRequest,
  CreateReplayRequest,
} from "../types";

const API_BASE = "";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export interface AppConfig {
  demoMode: boolean;
}

export const api = {
  // Config
  getConfig: () => request<AppConfig>("/api/config"),

  // Hooks
  listHooks: () => request<Hook[]>("/api/hooks"),

  getHook: (hookId: string) => request<Hook>(`/api/hooks/${hookId}`),

  createHook: (data: CreateHookRequest) =>
    request<Hook>("/api/hooks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateHook: (hookId: string, data: UpdateHookRequest) =>
    request<Hook>(`/api/hooks/${hookId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteHook: (hookId: string) =>
    request<void>(`/api/hooks/${hookId}`, {
      method: "DELETE",
    }),

  // Events
  listEvents: (
    hookId: string,
    page = 1,
    pageSize = 20,
    filters: { q?: string; method?: string } = {}
  ) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (filters.q) params.set("q", filters.q);
    if (filters.method && filters.method !== "ALL") {
      params.set("method", filters.method);
    }

    return request<ListEventsResponse>(
      `/api/hooks/${hookId}/events?${params.toString()}`
    );
  },

  getEvent: (eventId: string) => request<Event>(`/api/events/${eventId}`),

  deleteEvent: (eventId: string) =>
    request<void>(`/api/events/${eventId}`, {
      method: "DELETE",
    }),

  // Replays
  createReplay: (eventId: string, data: CreateReplayRequest) =>
    request<Replay>(`/api/events/${eventId}/replay`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listReplays: (eventId: string) =>
    request<Replay[]>(`/api/events/${eventId}/replays`),
};
