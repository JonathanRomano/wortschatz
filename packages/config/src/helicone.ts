/**
 * Optional Helicone (https://helicone.ai) routing for our LLM clients.
 *
 * Helicone is a pass-through proxy: point a provider SDK's `baseURL` at it
 * and add a couple of headers, and every request/response is logged in
 * Helicone's dashboard (prompt, completion, tokens, cost, latency) with no
 * SDK to install and no schema change on our side.
 *
 * The integration is **opt-in and fully reversible** via a single env var:
 *
 *   - `HELICONE_API_KEY` set   → calls route through the Helicone proxy.
 *   - missing / empty          → the helpers return `{}`, so each client is
 *                                byte-for-byte identical to its pre-Helicone
 *                                config and talks to the provider directly.
 *
 * These helpers read `process.env` at call time (not at module load) so the
 * decision is made when a client is lazily constructed. `HELICONE_API_KEY`
 * has no `NEXT_PUBLIC_` prefix, so Next.js keeps it server-only — it never
 * reaches the browser bundle.
 *
 * `Helicone-Async: true` makes Helicone log out-of-band: if their service is
 * down the provider call still goes through (we may lose that log line, which
 * is an acceptable trade for observability data). See scripts/README.md.
 */

/** Anthropic-compatible Helicone endpoint. */
export const HELICONE_ANTHROPIC_BASE_URL = "https://anthropic.helicone.ai";
/** OpenAI-compatible Helicone endpoint (note the `/v1` suffix). */
export const HELICONE_OPENAI_BASE_URL = "https://oai.helicone.ai/v1";

/**
 * Identifies which code path made a call, surfaced as
 * `Helicone-Property-Source` for dashboard filtering. Add a member here when
 * a new client instantiation starts routing through Helicone.
 */
export type HeliconeSource =
  | "scripts-claude"
  | "scripts-gpt"
  | "scripts-fitb"
  | "web-ai-lib"
  | "api-service"
  | "express-ai-generate";

/**
 * Provider-SDK constructor overrides. When Helicone is enabled this is the
 * `{ baseURL, defaultHeaders }` pair both the Anthropic and OpenAI SDKs
 * accept; when disabled it is the empty object, so spreading it into the
 * constructor options is a no-op.
 */
export type HeliconeClientOverrides =
  | { baseURL: string; defaultHeaders: Record<string, string> }
  | Record<never, never>;

/** True iff `HELICONE_API_KEY` is set to a non-empty value. */
export function heliconeEnabled(): boolean {
  return Boolean(process.env.HELICONE_API_KEY);
}

function baseHeaders(
  apiKey: string,
  source: HeliconeSource,
): Record<string, string> {
  return {
    "Helicone-Auth": `Bearer ${apiKey}`,
    // Async logging: a Helicone outage never blocks the provider call.
    "Helicone-Async": "true",
    // Vercel/Railway env, so dashboards can separate prod from preview/dev.
    "Helicone-Property-Environment": process.env.NODE_ENV ?? "development",
    // Future-proofing if another app ever shares the same Helicone key.
    "Helicone-Property-App": "wortschatz",
    "Helicone-Property-Source": source,
  };
}

/**
 * Constructor overrides for an Anthropic client. Spread into the
 * `new Anthropic({ ... })` options:
 *
 *   new Anthropic({ apiKey, ...heliconeAnthropicOverrides("web-ai-lib") })
 *
 * Returns `{}` when `HELICONE_API_KEY` is unset.
 */
export function heliconeAnthropicOverrides(
  source: HeliconeSource,
): HeliconeClientOverrides {
  const key = process.env.HELICONE_API_KEY;
  if (!key) return {};
  return {
    baseURL: HELICONE_ANTHROPIC_BASE_URL,
    defaultHeaders: baseHeaders(key, source),
  };
}

/**
 * Constructor overrides for an OpenAI client. Spread into the
 * `new OpenAI({ ... })` options. Returns `{}` when `HELICONE_API_KEY` is unset.
 */
export function heliconeOpenAIOverrides(
  source: HeliconeSource,
): HeliconeClientOverrides {
  const key = process.env.HELICONE_API_KEY;
  if (!key) return {};
  return {
    baseURL: HELICONE_OPENAI_BASE_URL,
    defaultHeaders: baseHeaders(key, source),
  };
}

/**
 * Per-request headers carrying the optional `Helicone-User-Id` tag. The
 * client is a cached singleton, so the user id can't live in
 * `defaultHeaders` — pass these on the individual `messages.create` /
 * `chat.completions.create` call instead:
 *
 *   client.messages.create(body, { headers: heliconeRequestHeaders(userId) })
 *
 * Returns `{}` (a harmless no-op header set) when Helicone is disabled or no
 * `userId` is available, so the call is unchanged in those cases.
 */
export function heliconeRequestHeaders(
  userId?: string,
): Record<string, string> {
  if (!heliconeEnabled() || !userId) return {};
  return { "Helicone-User-Id": userId };
}
