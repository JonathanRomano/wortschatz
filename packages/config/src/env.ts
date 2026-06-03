/**
 * Zod schemas for environment-variable validation.
 *
 * Each app calls the relevant `parse()` at boot so a missing or
 * malformed env var fails loudly with a useful message instead of
 * surfacing later as `undefined` in code. The schemas themselves do not
 * read process.env — that's the caller's job, which keeps this file
 * pure and easy to test.
 *
 * Web ↔ api auth uses a shared INTERNAL_API_SECRET + an X-User-Id
 * header on internal requests (decided during Sprint 03 planning). Both
 * schemas require the same secret so a mismatch fails at startup
 * rather than at first request.
 */
import { z } from "zod";

const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().optional(),
  /**
   * Optional Helicone (helicone.ai) key. When set, LLM calls in both apps
   * route through the Helicone proxy for prompt/response logging; when
   * absent they hit the providers directly. See packages/config/src/helicone.ts.
   * Lives on the base schema so both webEnvSchema and apiEnvSchema inherit it.
   */
  HELICONE_API_KEY: z.string().optional(),
});

export const webEnvSchema = baseEnvSchema.extend({
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Base URL of apps/api. Falls back to localhost for dev. */
  API_URL: z.string().url().default("http://localhost:4000"),
  /** Shared with apps/api; sent on every internal request. */
  INTERNAL_API_SECRET: z.string().min(32),
});

export const apiEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(4000),
  /** Trusted origin for CORS; usually the web app's public URL. */
  WEB_URL: z.string().url().default("http://localhost:3000"),
  /** Must equal apps/web's INTERNAL_API_SECRET. */
  INTERNAL_API_SECRET: z.string().min(32),
  /**
   * Optional. Enables GPT as a provider for POST /ai/generate-exercise.
   * Absent → the endpoint returns a deterministic stub for provider="gpt"
   * (same offline behavior as a missing ANTHROPIC_API_KEY for claude).
   */
  OPENAI_API_KEY: z.string().optional(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
export type ApiEnv = z.infer<typeof apiEnvSchema>;

export { baseEnvSchema };
