/**
 * Server-side client for the @wortschatz/api Express service.
 *
 * Every call ships:
 *   - X-Internal-Secret: shared with apps/api (INTERNAL_API_SECRET).
 *   - X-User-Id: the acting user, when one is known. Resolved in the
 *     web server from the NextAuth session before the request leaves
 *     our process — never set from a browser. Pass undefined for
 *     anonymous/admin calls.
 *
 * Only ever import this from server code (server actions, route
 * handlers, RSC). The shared secret must not reach the client bundle.
 * (Switch the convention to `import "server-only"` once the
 * `server-only` package is added to apps/web.)
 *
 * Errors are mapped to the same Error types web callers already catch
 * locally — most notably AiRateLimitedError on a 429 — so swapping
 * src/lib/ai.ts's in-process implementation for these remote calls
 * didn't change the public surface.
 */

import type { CefrLevel, ExerciseType } from "@wortschatz/database";
import type { AIEvaluation, ReviewResult } from "@wortschatz/types";
import type {
  GenerateExerciseRequest,
  GeneratedExerciseDTO,
} from "@wortschatz/exercises";

import { AiRateLimitedError } from "@/lib/ai-rate-limit";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const SECRET = process.env.INTERNAL_API_SECRET ?? "";

function authHeaders(userId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Internal-Secret": SECRET,
  };
  if (userId) headers["X-User-Id"] = userId;
  return headers;
}

async function postJson<T>(
  path: string,
  body: unknown,
  userId: string | undefined,
  endpoint: "REVIEW_TEXT" | "EVALUATE_ANSWER" | "GENERATE_EXERCISE",
): Promise<T> {
  if (!SECRET) {
    throw new Error(
      "INTERNAL_API_SECRET is not set — apps/web cannot reach apps/api.",
    );
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders(userId),
    body: JSON.stringify(body),
    // RSC fetches are cached by default; opt out for AI calls.
    cache: "no-store",
  });

  if (res.status === 429) {
    // Surface as the same error shape callers catch locally.
    const payload = (await res.json().catch(() => ({}))) as {
      count?: number;
      limit?: number;
    };
    throw new AiRateLimitedError(
      endpoint,
      payload.count ?? 0,
      payload.limit ?? 0,
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `api ${path} failed: HTTP ${res.status} ${res.statusText} ${text.slice(0, 200)}`,
    );
  }

  return (await res.json()) as T;
}

export async function reviewTextRemote(
  text: string,
  level: CefrLevel,
  userId?: string,
): Promise<ReviewResult> {
  return postJson<ReviewResult>(
    "/ai/review-text",
    { text, level },
    userId,
    "REVIEW_TEXT",
  );
}

export async function evaluateAnswerRemote(
  exercise: { type: ExerciseType; content: unknown; solution: unknown },
  userAnswer: unknown,
  userId?: string,
): Promise<AIEvaluation> {
  return postJson<AIEvaluation>(
    "/ai/evaluate-answer",
    { exercise, userAnswer },
    userId,
    "EVALUATE_ANSWER",
  );
}

/**
 * Raised when the api returns 422 from /ai/generate-exercise — the model
 * produced output that didn't parse or didn't pass the per-type schema.
 * It's a per-item content miss, not a transport failure, so runGeneration
 * records it as a `validation_error` and continues rather than aborting.
 */
export class GenerationValidationError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(`Generated exercise failed validation: ${errors.join("; ")}`);
    this.name = "GenerationValidationError";
    this.errors = errors;
  }
}

/**
 * Generate one exercise via apps/api (POST /ai/generate-exercise). The api
 * builds the prompt, calls the provider, and validates the output; this
 * returns the validated exercise for the web to insert. Errors map to the
 * classes runGeneration already understands:
 *   429 → AiRateLimitedError (stops the batch),
 *   422 → GenerationValidationError (skip this item, continue),
 *   else → Error (treated as a model error, continue).
 */
export async function generateExerciseRemote(
  input: GenerateExerciseRequest,
  userId?: string,
): Promise<GeneratedExerciseDTO> {
  if (!SECRET) {
    throw new Error(
      "INTERNAL_API_SECRET is not set — apps/web cannot reach apps/api.",
    );
  }

  const res = await fetch(`${API_URL}/ai/generate-exercise`, {
    method: "POST",
    headers: authHeaders(userId),
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (res.status === 429) {
    const payload = (await res.json().catch(() => ({}))) as {
      count?: number;
      limit?: number;
    };
    throw new AiRateLimitedError(
      "GENERATE_EXERCISE",
      payload.count ?? 0,
      payload.limit ?? 0,
    );
  }

  if (res.status === 422) {
    const payload = (await res.json().catch(() => ({}))) as {
      errors?: string[];
    };
    throw new GenerationValidationError(
      payload.errors ?? ["Generated exercise failed validation."],
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `api /ai/generate-exercise failed: HTTP ${res.status} ${res.statusText} ${text.slice(0, 200)}`,
    );
  }

  return (await res.json()) as GeneratedExerciseDTO;
}
