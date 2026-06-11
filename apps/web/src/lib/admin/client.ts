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
  CreateDraftInput,
  GenerateRequestInput,
  PreviewRequestInput,
  SavedPromptCreateInput,
  SavedPromptUpdateInput,
  TestGenerateInput,
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

// --- Base-prompt curation ---------------------------------------------

export type PromptStatusDTO = "DRAFT" | "ACTIVE" | "INACTIVE";

export type BasePromptVersionDTO = {
  id: string;
  versionNumber: number;
  status: PromptStatusDTO;
  systemPrompt: string;
  userInstructions: string;
  changeNote: string | null;
  authorId: string | null;
  authorEmail: string | null;
  authorRole: string | null;
  createdAt: string;
  publishedAt: string | null;
  deactivatedAt: string | null;
};

export type BasePromptListItem = {
  id: string;
  type: string;
  level: string;
  description: string | null;
  activeVersionNumber: number | null;
  hasDraftPending: boolean;
  /** The latest pending DRAFT, if any — the publish target. */
  draftVersionId: string | null;
  lastEditedAt: string | null;
  lastEditedByEmail: string | null;
  lastEditedByRole: string | null;
};

/** The code-locked technical blocks, rendered for read-only display. */
export type LockedBlocks = { jsonShape: string; rules: string };

export type BasePromptDetail = {
  id: string;
  type: string;
  level: string;
  description: string | null;
  activeVersion: BasePromptVersionDTO | null;
  /** All versions, latest first, with full content. */
  versions: BasePromptVersionDTO[];
  locked: LockedBlocks;
};

export type TestGeneratedExercise = {
  title: string;
  content: unknown;
  solution: unknown;
  explanation: unknown;
  tags: string[];
  tip?: unknown;
  modelUsed: string;
};

export type BasePromptListResponse = Ok<{ prompts: BasePromptListItem[] }> | Err;
export type BasePromptDetailResponse = Ok<{ prompt: BasePromptDetail }> | Err;
export type BasePromptVersionResponse = Ok<{ version: BasePromptVersionDTO }> | Err;
export type TestGenerateResponse =
  | Ok<{ exercise: TestGeneratedExercise; tokenCost: number }>
  | Err;

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

// --- Base-prompt curation wrappers ------------------------------------

export function listBasePrompts(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const s = qs.toString();
  return getJson<BasePromptListResponse>(`/api/admin/base-prompts${s ? `?${s}` : ""}`);
}

export function getBasePrompt(id: string) {
  return getJson<BasePromptDetailResponse>(`/api/admin/base-prompts/${id}`);
}

export function createDraftVersion(id: string, body: CreateDraftInput) {
  return postJson<BasePromptVersionResponse>(
    `/api/admin/base-prompts/${id}/versions`,
    body,
  );
}

export function testGenerateVersion(
  id: string,
  versionId: string,
  body: TestGenerateInput,
) {
  return postJson<TestGenerateResponse>(
    `/api/admin/base-prompts/${id}/versions/${versionId}/test-generate`,
    body,
  );
}

export function publishVersion(id: string, versionId: string) {
  return postJson<BasePromptVersionResponse>(
    `/api/admin/base-prompts/${id}/versions/${versionId}/publish`,
    {},
  );
}

export function revertVersion(id: string, versionId: string) {
  return postJson<BasePromptVersionResponse>(
    `/api/admin/base-prompts/${id}/versions/${versionId}/revert`,
    {},
  );
}
