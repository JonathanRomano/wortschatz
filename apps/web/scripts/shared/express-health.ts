/**
 * Is apps/api reachable? The CLI prefers the boundary-correct remote
 * generator (POST /ai/generate-exercise) but falls back to the in-process
 * SDK when the API isn't running locally (Decision 3). This probes
 * GET {API_URL}/health with a short timeout so an absent API doesn't hang
 * the script.
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function isExpressReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}
