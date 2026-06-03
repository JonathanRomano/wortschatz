/**
 * Boundary guard (API-boundary sprint, Decision 6). Statically asserts that
 * no file under apps/web/src imports an LLM provider SDK directly — those
 * calls must go through apps/api via src/lib/api-client.ts. CLI scripts under
 * apps/web/scripts/ may import the SDK (the offline-fallback generators), so
 * they're outside this scan.
 *
 * Uses a dependency-free recursive fs walk (no `glob` in the repo) and skips
 * __tests__ dirs — including this one, whose regex literals would otherwise
 * be flagged.
 */
import { describe, expect, it } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// vitest runs with cwd = the apps/web workspace root (same assumption the
// avatar route makes), so the source tree is ./src.
const SRC_DIR = join(process.cwd(), "src");

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      files.push(...(await collectSourceFiles(full)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const BANNED = [
  { label: "@anthropic-ai/sdk", re: /from\s+["']@anthropic-ai\/sdk["']/ },
  { label: "openai", re: /from\s+["']openai["']/ },
];

describe("API boundary", () => {
  it("apps/web/src imports no LLM provider SDK directly", async () => {
    const files = await collectSourceFiles(SRC_DIR);
    // Sanity: the walk actually found source files.
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const content = await readFile(file, "utf8");
      for (const { label, re } of BANNED) {
        if (re.test(content)) {
          offenders.push(`${file.slice(SRC_DIR.length)} imports ${label}`);
        }
      }
    }

    // Any LLM call from apps/web must go through apps/api (api-client.ts).
    expect(offenders).toEqual([]);
  });
});
