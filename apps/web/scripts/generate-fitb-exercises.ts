/**
 * DEPRECATED (Exercise Generation v2): this FITB prototype was
 * generalized into the per-type, per-provider generators. Prefer
 * `pnpm gen:claude --type FILL_IN_THE_BLANK …` (scripts/claude/) or the
 * GPT equivalent. Kept only until a cleanup pass.
 *
 * Generate FILL_IN_THE_BLANK exercises with a prompt that lives in this
 * file. Edit `SYSTEM_PROMPT` / `userPrompt()` below to iterate on what
 * Claude produces for this exercise type — none of it is shared with
 * other types, so changes here don't affect /review or /evaluate, and
 * the AI cache is bypassed entirely so every run hits Claude fresh.
 *
 * Usage:
 *   pnpm db:generate-fitb -- --level A2
 *   pnpm db:generate-fitb -- --level A2 --count 10
 *   pnpm db:generate-fitb                  # prompts for the level
 *
 * Without ANTHROPIC_API_KEY the script writes a deterministic stub so
 * you can smoke-test the DB write path without burning tokens.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import Anthropic from "@anthropic-ai/sdk";

import type { CefrLevel, Prisma } from "@wortschatz/database";
import { PrismaClient } from "@wortschatz/database";
import { heliconeAnthropicOverrides } from "@wortschatz/config";

import {
  FillInTheBlankContent,
  FillInTheBlankSolution,
} from "@/lib/exercises/schemas";

const prisma = new PrismaClient();

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const AI_CONFIGURED = Boolean(process.env.ANTHROPIC_API_KEY);

// Mirrors the LEVELS array on `/exercises`. Update both together if the
// platform's offered range changes.
const LEVELS = ["A1", "A2", "B1"] as const satisfies readonly CefrLevel[];

const TOPICS = ["food", "travel", "work", "family", "weather"];
const DEFAULT_COUNT = 5;

// ============================================================================
// PROMPT — edit freely. The shape of the JSON output is enforced below by
// the FillInTheBlankContent / FillInTheBlankSolution Zod schemas, so if
// you change those keys here you must also update the schemas in
// src/lib/exercises/schemas.ts (and the renderer + grader).
// ============================================================================

const SYSTEM_PROMPT = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce FILL_IN_THE_BLANK exercises. Respond with a single JSON object and nothing else — no prose, no markdown fences.
The German content must be correct, idiomatic, and appropriate for the requested CEFR level.
Localized fields (explanation, tip) must be a JSON object with keys en, pt, tr, uk, each a non-empty string.`;

function userPrompt(level: CefrLevel, topic: string): string {
  // Free-form user message. Tweak wording, examples, constraints here.
  // The structure below is intentionally explicit so Claude doesn't drift.
  return `Write ONE FILL_IN_THE_BLANK exercise.

CEFR level: ${level}
Topic: ${topic}
Target language: German

Output JSON shape:
{
  "title": "<short German title, e.g. 'Lückentext: <topic>'>",
  "content": {
    "sentence": "<a German sentence with one or more blanks marked by exactly three underscores '___'>",
    "blanksCount": <integer, must match the number of '___' in the sentence>,
    "hint": "<optional short hint, e.g. the infinitive of a verb the learner needs to conjugate; omit the field if there is no useful hint>"
  },
  "solution": {
    "blanks": ["<answer for blank 1>", "<answer for blank 2>", ...]   // length === blanksCount, left-to-right
  },
  "explanation": {
    "en": "<one or two sentences explaining the grammar/vocab point>",
    "pt": "<same in Brazilian Portuguese>",
    "tr": "<same in Turkish>",
    "uk": "<same in Ukrainian>"
  },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": {
    "en": "<one short hint that nudges toward the answer WITHOUT giving it away>",
    "pt": "<same idea, in Brazilian Portuguese>",
    "tr": "<same idea, in Turkish>",
    "uk": "<same idea, in Ukrainian>"
  }
}

Rules:
- For ${level}, use only vocabulary and grammar the learner is expected to know at that level.
- A1 sentences should be 4–8 words, simple present tense.
- A2 may include perfect tense and modal verbs.
- B1 may use subordinate clauses, dative/accusative cases, and a wider vocabulary.
- The tip must NOT contain the answer. Hint at structure ("look for an accusative article") not at the word.
- Keep title under 60 chars; keep tip under ~120 chars per locale.`;
}

// ============================================================================

type CliArgs = { level?: CefrLevel; count: number };

function parseArgs(argv: string[]): CliArgs {
  let level: CefrLevel | undefined;
  let count = DEFAULT_COUNT;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--level" && argv[i + 1]) {
      const v = argv[i + 1]!.toUpperCase();
      if ((LEVELS as readonly string[]).includes(v)) {
        level = v as CefrLevel;
      } else {
        throw new Error(
          `Unknown --level "${argv[i + 1]}". Expected one of: ${LEVELS.join(", ")}.`,
        );
      }
      i++;
    } else if (arg === "--count" && argv[i + 1]) {
      const n = Number.parseInt(argv[i + 1]!, 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(
          `--count must be a positive integer, got "${argv[i + 1]}".`,
        );
      }
      count = n;
      i++;
    }
  }

  return { level, count };
}

async function promptLevel(): Promise<CefrLevel> {
  if (!stdin.isTTY) {
    throw new Error(
      `No --level provided and stdin is not a TTY. ` +
        `Pass --level <${LEVELS.join("|")}> on the command line.`,
    );
  }
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const raw = (await rl.question(`Level (${LEVELS.join(" | ")})? `))
      .trim()
      .toUpperCase();
    if (!(LEVELS as readonly string[]).includes(raw)) {
      throw new Error(
        `Unknown level "${raw}". Expected one of: ${LEVELS.join(", ")}.`,
      );
    }
    return raw as CefrLevel;
  } finally {
    rl.close();
  }
}

/** Tolerate ```json fences and leading/trailing prose. */
function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      throw new Error(
        `Claude response is not valid JSON: ${candidate.slice(0, 200)}…`,
      );
    }
    return JSON.parse(candidate.slice(first, last + 1));
  }
}

type LocalizedText = { en?: string; pt?: string; tr?: string; uk?: string };

type GeneratedFitb = {
  title: string;
  content: { sentence: string; blanksCount: number; hint?: string };
  solution: { blanks: string[] };
  explanation: LocalizedText;
  tags: string[];
  tip?: LocalizedText;
};

function pickLocalizedFromUnknown(value: unknown): LocalizedText | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0,
  );
  return entries.length > 0
    ? (Object.fromEntries(entries) as LocalizedText)
    : undefined;
}

function stubExercise(level: CefrLevel, topic: string): GeneratedFitb {
  return {
    title: `Lückentext: ${topic} (${level})`,
    content: {
      sentence: "Ich ___ einen Apfel.",
      blanksCount: 1,
      hint: "Verb 'essen'",
    },
    solution: { blanks: ["esse"] },
    explanation: {
      en: `(Stub) Placeholder fill-in-the-blank for ${level} on "${topic}".`,
      pt: `(Stub) Exercício de exemplo para ${level} sobre "${topic}".`,
      tr: `(Stub) "${topic}" konusunda ${level} için örnek alıştırma.`,
      uk: `(Stub) Приклад вправи на тему "${topic}" для рівня ${level}.`,
    },
    tags: [topic, level.toLowerCase(), "stub"],
    tip: {
      en: "It's the first-person singular present of a common 'eat' verb.",
      pt: "É a primeira pessoa do singular do presente do verbo 'comer'.",
      tr: "Yaygın bir 'yemek' fiilinin birinci tekil şahıs şimdiki zamanıdır.",
      uk: "Це форма дієслова «їсти» в теперішньому часі, перша особа однини.",
    },
  };
}

let cachedClient: Anthropic | null = null;
function client(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      ...heliconeAnthropicOverrides("scripts-fitb"),
    });
  }
  return cachedClient;
}

async function generateOne(
  level: CefrLevel,
  topic: string,
): Promise<GeneratedFitb> {
  if (!AI_CONFIGURED) return stubExercise(level, topic);

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt(level, topic) }],
  });

  const text = resp.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = extractJson(text) as Record<string, unknown>;

  const contentParsed = FillInTheBlankContent.safeParse(parsed.content);
  if (!contentParsed.success) {
    throw new Error(
      `Invalid content: ${contentParsed.error.message}\nGot: ${JSON.stringify(parsed.content)}`,
    );
  }
  const solutionParsed = FillInTheBlankSolution.safeParse(parsed.solution);
  if (!solutionParsed.success) {
    throw new Error(
      `Invalid solution: ${solutionParsed.error.message}\nGot: ${JSON.stringify(parsed.solution)}`,
    );
  }

  // Cross-check the count matches the underscores in the sentence — a
  // common Claude mistake that the schema can't catch on its own.
  const underscoreBlanks = (contentParsed.data.sentence.match(/___/g) ?? [])
    .length;
  if (underscoreBlanks !== contentParsed.data.blanksCount) {
    throw new Error(
      `blanksCount=${contentParsed.data.blanksCount} but the sentence has ${underscoreBlanks} '___' marker(s).`,
    );
  }
  if (solutionParsed.data.blanks.length !== contentParsed.data.blanksCount) {
    throw new Error(
      `solution.blanks has ${solutionParsed.data.blanks.length} entries but blanksCount=${contentParsed.data.blanksCount}.`,
    );
  }

  return {
    title:
      typeof parsed.title === "string" && parsed.title.length > 0
        ? parsed.title
        : `Lückentext: ${topic}`,
    content: contentParsed.data,
    solution: solutionParsed.data,
    explanation: pickLocalizedFromUnknown(parsed.explanation) ?? {},
    tags: Array.isArray(parsed.tags)
      ? (parsed.tags as unknown[])
          .filter((t): t is string => typeof t === "string")
          .slice(0, 5)
      : [topic, level.toLowerCase()],
    ...(pickLocalizedFromUnknown(parsed.tip)
      ? { tip: pickLocalizedFromUnknown(parsed.tip)! }
      : {}),
  };
}

async function main() {
  const { level: argLevel, count } = parseArgs(process.argv.slice(2));
  const level = argLevel ?? (await promptLevel());

  console.log(`AI mode: ${AI_CONFIGURED ? "real" : "stub"} (model: ${MODEL})`);
  console.log(
    `Generating ${count} FILL_IN_THE_BLANK exercise(s) at level ${level}…`,
  );

  const admin = await prisma.user.findUnique({
    where: { email: "admin@wortschatz.app" },
    select: { id: true },
  });
  if (!admin) {
    throw new Error("Run `pnpm db:seed` first to create the admin user.");
  }

  let created = 0;
  for (let i = 0; i < count; i++) {
    const topic = TOPICS[i % TOPICS.length]!;
    const ex = await generateOne(level, topic);
    await prisma.exercise.create({
      data: {
        authorId: admin.id,
        type: "FILL_IN_THE_BLANK",
        title: ex.title,
        targetLanguage: "de",
        level,
        content: ex.content as Prisma.InputJsonValue,
        solution: ex.solution as Prisma.InputJsonValue,
        explanation: ex.explanation as Prisma.InputJsonValue,
        tags: ex.tags,
        status: "PUBLISHED",
        model: AI_CONFIGURED ? MODEL : null,
        ...(ex.tip ? { tip: ex.tip as Prisma.InputJsonValue } : {}),
      },
    });
    created += 1;
    console.log(`  [${created}/${count}] ${level} · ${topic} · ${ex.title}`);
  }

  console.log(
    `Created ${created} FILL_IN_THE_BLANK exercise(s) at level ${level}.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
