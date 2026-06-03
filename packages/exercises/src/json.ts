/**
 * Tolerant JSON extraction for model responses. Both Claude and GPT can
 * emit ```json fences or stray prose despite "JSON only" instructions
 * (GPT JSON-mode is reliable, but the fence-stripping path is cheap
 * insurance). Mirrors the helper in src/lib/ai.ts.
 */
export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    // Fall through to a brace scan for the outermost object.
  }
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error(
      `Response is not valid JSON: ${candidate.slice(0, 200)}…`,
    );
  }
  return JSON.parse(candidate.slice(first, last + 1));
}
