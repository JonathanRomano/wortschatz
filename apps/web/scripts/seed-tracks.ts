/**
 * Seed the career-track content (Sprint 05): walks every unit of every
 * track curriculum (src/content/tracks/) and generates its exercises via
 * the shared runner, stamped with `beruf:<profession>` + `unit:<slug>`
 * tags and the unit's German workplace topic.
 *
 *   pnpm gen:seed-tracks                          # all four tracks
 *   pnpm gen:seed-tracks --profession pflege      # one track
 *   pnpm gen:seed-tracks --unit uebergabe         # one unit
 *   pnpm gen:seed-tracks --dry-run                # generate, print, insert nothing
 *   pnpm gen:seed-tracks --delay-ms 1000          # pace the provider calls
 *
 * Each unit gets TYPE_MIX (8 exercises across 8 types — vocabulary,
 * scenario, and production shapes). With targetCount 6 per unit, a unit
 * is completable without passing every exercise. Rows land as PUBLISHED
 * (same as the other generators) — skim them in /admin before opening a
 * track to real users.
 *
 * Provider selection mirrors gen:claude: the apps/api endpoint when
 * reachable, otherwise the in-process Anthropic SDK fallback.
 */
import { claudePrompts } from "@wortschatz/exercises";
import { prisma } from "@wortschatz/database";
import {
  PROFESSION_SLUGS,
  isProfessionSlug,
  type ProfessionSlug,
} from "@wortschatz/config";
import type { ExerciseType } from "@wortschatz/database";

import { runGeneration } from "./shared/run";
import { makeDirectGenerator, makeRemoteGenerator } from "./shared/generators";
import { isExpressReachable } from "./shared/express-health";
import { callClaude, CLAUDE_DEFAULT_MODEL } from "./claude/client";
import { TRACKS, allUnits } from "../src/content/tracks";

/** Exercises per unit, by type. Order = generation order. */
export const TYPE_MIX: Array<{ type: ExerciseType; count: number }> = [
  { type: "FILL_IN_THE_BLANK", count: 1 },
  { type: "MULTIPLE_CHOICE", count: 1 },
  { type: "MATCHING", count: 1 },
  { type: "WORD_ORDER", count: 1 },
  { type: "READING_COMPREHENSION", count: 1 },
  { type: "ERROR_CORRECTION", count: 1 },
  { type: "VERB_CONJUGATION", count: 1 },
  { type: "FREE_WRITING", count: 1 },
];

interface SeedArgs {
  profession?: ProfessionSlug;
  unit?: string;
  dryRun: boolean;
  delayMs: number;
}

function fail(msg: string): never {
  throw new Error(msg);
}

export function parseSeedArgs(argv: string[]): SeedArgs {
  let profession: ProfessionSlug | undefined;
  let unit: string | undefined;
  let dryRun = false;
  let delayMs = 500;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--profession": {
        const v = (argv[i + 1] ?? "").toLowerCase();
        if (!isProfessionSlug(v)) {
          fail(
            `Unknown --profession "${v}". Expected one of: ${PROFESSION_SLUGS.join(", ")}.`,
          );
        }
        profession = v;
        i++;
        break;
      }
      case "--unit": {
        const v = argv[i + 1] ?? "";
        if (!allUnits().some(({ unit: u }) => u.slug === v)) {
          const known = allUnits()
            .map(({ unit: u }) => u.slug)
            .join(", ");
          fail(`Unknown --unit "${v}". Expected one of: ${known}.`);
        }
        unit = v;
        i++;
        break;
      }
      case "--dry-run":
        dryRun = true;
        break;
      case "--delay-ms": {
        const n = Number.parseInt(argv[i + 1] ?? "", 10);
        if (!Number.isFinite(n) || n < 0) fail("--delay-ms must be a non-negative integer.");
        delayMs = n;
        i++;
        break;
      }
      default:
        fail(`Unknown argument "${arg}".`);
    }
  }

  return { profession, unit, dryRun, delayMs };
}

async function main() {
  const args = parseSeedArgs(process.argv.slice(2));

  const useExpress =
    Boolean(process.env.INTERNAL_API_SECRET) && (await isExpressReachable());
  const generate = useExpress
    ? makeRemoteGenerator("claude")
    : makeDirectGenerator(callClaude, claudePrompts, "claude");
  console.log(
    useExpress
      ? "[gen:seed-tracks] using the apps/api /ai/generate-exercise endpoint"
      : "[gen:seed-tracks] apps/api unreachable — falling back to the in-process Anthropic SDK",
  );

  const work = allUnits().filter(
    ({ profession, unit }) =>
      (!args.profession || profession === args.profession) &&
      (!args.unit || unit.slug === args.unit),
  );
  const perUnit = TYPE_MIX.reduce((sum, m) => sum + m.count, 0);
  console.log(
    `[gen:seed-tracks] ${work.length} unit(s) × ${perUnit} exercises` +
      `${args.dryRun ? " · DRY RUN" : ""}`,
  );

  let ok = 0;
  let bad = 0;
  for (const { profession, unit } of work) {
    console.log(`\n=== ${profession} / ${unit.slug} — ${unit.topic}`);
    for (const mix of TYPE_MIX) {
      const result = await runGeneration({
        providerLabel: "claude",
        generate,
        defaultModel: CLAUDE_DEFAULT_MODEL,
        request: {
          type: mix.type,
          level: unit.level,
          topic: unit.topic,
          count: mix.count,
          dryRun: args.dryRun,
          professionSlug: profession,
          unitSlug: unit.slug,
        },
        delayMs: args.delayMs,
        onProgress: (line) => console.log(line),
      });
      ok += result.generated.length;
      bad += result.failed.length;
      // A rate-limited batch would fail identically for every remaining
      // call — bail out of the whole seed instead of burning requests.
      if (result.failed.some((f) => f.code === "rate_limited")) {
        console.error("[gen:seed-tracks] rate-limited — stopping the seed here.");
        console.log(`[gen:seed-tracks] total: ${ok} generated, ${bad} failed`);
        return;
      }
    }
  }

  console.log(`\n[gen:seed-tracks] total: ${ok} generated, ${bad} failed`);
  const summary = await prisma.exercise.groupBy({
    by: ["level"],
    where: { tags: { hasSome: PROFESSION_SLUGS.map((s) => `beruf:${s}`) } },
    _count: { _all: true },
  });
  if (!args.dryRun) {
    console.log(
      "[gen:seed-tracks] beruf-tagged rows by level:",
      summary.map((r) => `${r.level}=${r._count._all}`).join(" ") || "none",
    );
  }
}

// Only run when invoked as a CLI (vitest imports this module for the
// arg-parser + TYPE_MIX tests).
if (process.argv[1]?.endsWith("seed-tracks.ts")) {
  main()
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
