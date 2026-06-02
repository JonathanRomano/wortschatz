/**
 * Browser-side fetch wrappers for the admin generator API. Imported by the
 * client components under /admin/generate, /admin/prompts, and the history
 * pages. Every endpoint returns a discriminated `{ ok }` body, returned here
 * verbatim so callers branch on `res.ok`.
 *
 * Type-only imports keep the zod schemas and the script-side modules out of
 * the client bundle.
 */
import type {
  GenerateRequestInput,
  PreviewRequestInput,
  SavedPromptCreateInput,
  SavedPromptUpdateInput,
} from "@/lib/admin/schemas";
import type { GenerationResult } from "@scripts/shared/types";

export type SavedPromptDTO = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  systemPrompt: string | null;
  userInstructions: string | null;
  useCount: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string | null;
};

export type SessionListItem = {
  id: string;
  createdAt: string;
  completedAt: string | null;
  source: "UI" | "CLI";
  provider: string;
  modelUsed: string;
  type: string;
  level: string;
  topic: string | null;
  requestedCount: number;
  successCount: number;
  failureCount: number;
  durationMs: number | null;
  customSystem: boolean;
  customInstructions: boolean;
  savedPromptId: string | null;
  savedPromptName: string | null;
  exerciseCount: number;
};

export type SessionExercise = {
  id: string;
  title: string;
  type: string;
  level: string;
  status: string;
  createdAt: string;
};

export type SessionFailure = {
  index: number;
  topic: string;
  reason: string;
  code: string;
};

export type SessionDetail = Omit<SessionListItem, "exerciseCount"> & {
  failures: SessionFailure[] | null;
  exercises: SessionExercise[];
};

type Err = { ok: false; error: string; code: string };
type Ok<T> = { ok: true } & T;

export type GenerateResponse = Ok<{ result: GenerationResult }> | Err;
export type PreviewResponse =
  | Ok<{ system: string; user: string; estimatedTokens: number }>
  | Err;
export type SavedPromptsListResponse = Ok<{ prompts: SavedPromptDTO[] }> | Err;
export type SavedPromptResponse = Ok<{ prompt: SavedPromptDTO }> | Err;
export type DeleteResponse = Ok<{ deleted: true }> | Err;
export type SessionsListResponse =
  | Ok<{ page: number; pageSize: number; total: number; sessions: SessionListItem[] }>
  | Err;
export type SessionDetailResponse = Ok<{ session: SessionDetail }> | Err;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

async function send<T>(url: string, method: "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return (await res.json()) as T;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  return (await res.json()) as T;
}

export function generateExercises(body: GenerateRequestInput) {
  return postJson<GenerateResponse>("/api/admin/generate-exercises", body);
}

export function previewPrompt(body: PreviewRequestInput) {
  return postJson<PreviewResponse>("/api/admin/preview-prompt", body);
}

export function listSavedPrompts(type?: string) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  return getJson<SavedPromptsListResponse>(`/api/admin/saved-prompts${qs}`);
}

export function createSavedPrompt(body: SavedPromptCreateInput) {
  return postJson<SavedPromptResponse>("/api/admin/saved-prompts", body);
}

export function updateSavedPrompt(id: string, body: SavedPromptUpdateInput) {
  return send<SavedPromptResponse>(`/api/admin/saved-prompts/${id}`, "PATCH", body);
}

export function deleteSavedPrompt(id: string) {
  return send<DeleteResponse>(`/api/admin/saved-prompts/${id}`, "DELETE");
}

export function listSessions(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const s = qs.toString();
  return getJson<SessionsListResponse>(`/api/admin/generation-sessions${s ? `?${s}` : ""}`);
}

export function getSession(id: string) {
  return getJson<SessionDetailResponse>(`/api/admin/generation-sessions/${id}`);
}
