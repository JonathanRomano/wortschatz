/**
 * Hand-rolled argument parser for the v2 generators — five-ish flags
 * don't justify a dependency. Shared by claude/generate.ts and
 * gpt/generate.ts so the two CLIs stay identical.
 *
 *   --type   <ExerciseType>   (required)
 *   --level  <A1|A2|B1|B2>    (required)
 *   --count  <n>              (default 5)
 *   --topic  <string>         (optional; cycles canonical topics if omitted)
 *   --model  <string>         (optional; overrides the provider default)
 *   --delay-ms <n>            (default 500)
 *   --profession <slug>       (optional; stamps beruf:<slug> on the rows)
 *   --unit   <slug>           (optional; stamps unit:<slug> on the rows)
 *   --dry-run                 (boolean)
 *   --no-recent               (boolean)
 *   --verbose                 (boolean)
 */
import type { CefrLevel, ExerciseType } from "@wortschatz/database";
import { PROFESSION_SLUGS, isProfessionSlug, type ProfessionSlug } from "@wortschatz/config";

import { contentSchemaFor } from "@wortschatz/exercises";

import { SUPPORTED_LEVELS, type CliArgs } from "./types";

// The schema registry is keyed by every ExerciseType, so its keys are the
// authoritative runtime list of valid --type values.
const VALID_TYPES = Object.keys(contentSchemaFor) as ExerciseType[];

function fail(msg: string): never {
  throw new Error(msg);
}

function takeValue(argv: string[], i: number, flag: string): string {
  const v = argv[i + 1];
  if (v === undefined || v.startsWith("--")) {
    fail(`Missing value for ${flag}.`);
  }
  return v;
}

export function parseArgs(argv: string[]): CliArgs {
  let type: ExerciseType | undefined;
  let level: CefrLevel | undefined;
  let count = 5;
  let topic: string | undefined;
  let model: string | undefined;
  let delayMs = 500;
  let profession: ProfessionSlug | undefined;
  let unit: string | undefined;
  let dryRun = false;
  let noRecent = false;
  let verbose = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--type": {
        const v = takeValue(argv, i, "--type").toUpperCase();
        if (!VALID_TYPES.includes(v as ExerciseType)) {
          fail(`Unknown --type "${v}". Expected one of: ${VALID_TYPES.join(", ")}.`);
        }
        type = v as ExerciseType;
        i++;
        break;
      }
      case "--level": {
        const v = takeValue(argv, i, "--level").toUpperCase();
        if (!(SUPPORTED_LEVELS as readonly string[]).includes(v)) {
          fail(`Unknown --level "${v}". Expected one of: ${SUPPORTED_LEVELS.join(", ")}.`);
        }
        level = v as CefrLevel;
        i++;
        break;
      }
      case "--count": {
        const n = Number.parseInt(takeValue(argv, i, "--count"), 10);
        if (!Number.isFinite(n) || n <= 0) fail(`--count must be a positive integer.`);
        count = n;
        i++;
        break;
      }
      case "--topic":
        topic = takeValue(argv, i, "--topic");
        i++;
        break;
      case "--model":
        model = takeValue(argv, i, "--model");
        i++;
        break;
      case "--delay-ms": {
        const n = Number.parseInt(takeValue(argv, i, "--delay-ms"), 10);
        if (!Number.isFinite(n) || n < 0) fail(`--delay-ms must be a non-negative integer.`);
        delayMs = n;
        i++;
        break;
      }
      case "--profession": {
        const v = takeValue(argv, i, "--profession").toLowerCase();
        if (!isProfessionSlug(v)) {
          fail(
            `Unknown --profession "${v}". Expected one of: ${PROFESSION_SLUGS.join(", ")}.`,
          );
        }
        profession = v;
        i++;
        break;
      }
      case "--unit":
        unit = takeValue(argv, i, "--unit");
        i++;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--no-recent":
        noRecent = true;
        break;
      case "--verbose":
        verbose = true;
        break;
      default:
        fail(`Unknown argument "${arg}".`);
    }
  }

  if (!type) fail(`--type is required (one of: ${VALID_TYPES.join(", ")}).`);
  if (!level) fail(`--level is required (one of: ${SUPPORTED_LEVELS.join(", ")}).`);

  return {
    type,
    level,
    count,
    topic,
    model,
    delayMs,
    profession,
    unit,
    dryRun,
    noRecent,
    verbose,
  };
}
