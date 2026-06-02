/**
 * Zod request schemas + shared shapes for the admin generator API.
 *
 * The exercise-type / level enums are pinned here (rather than imported from
 * Prisma) so the API contract is explicit and the UI-supported level set
 * (A1–B2, matching the generator's SUPPORTED_LEVELS) is the validation
 * boundary — not the wider CefrLevel enum (which includes C1/C2).
 */
import { z } from "zod";

import type { GenerationResult } from "@scripts/shared/types";

export const EXERCISE_TYPES = [
  "FILL_IN_THE_BLANK",
  "MULTIPLE_CHOICE",
  "TRANSLATION",
  "WORD_ORDER",
  "MATCHING",
  "LISTENING_COMPREHENSION",
  "READING_COMPREHENSION",
  "VERB_CONJUGATION",
  "ERROR_CORRECTION",
  "FREE_WRITING",
] as const;

export const GENERATOR_LEVELS = ["A1", "A2", "B1", "B2"] as const;

export const ExerciseTypeSchema = z.enum(EXERCISE_TYPES);
export const GeneratorLevelSchema = z.enum(GENERATOR_LEVELS);

/** Cap custom prompt overrides so a paste-bomb can't blow up a Claude call. */
const PROMPT_MAX = 20_000;

export const CustomPromptSchema = z
  .object({
    system: z.string().max(PROMPT_MAX).optional(),
    userInstructions: z.string().max(PROMPT_MAX).optional(),
  })
  .strict();

export const GenerateRequestSchema = z
  .object({
    type: ExerciseTypeSchema,
    level: GeneratorLevelSchema,
    topic: z.string().trim().min(1).max(120).optional(),
    count: z.number().int().min(1).max(20),
    dryRun: z.boolean().optional(),
    noRecent: z.boolean().optional(),
    customPrompt: CustomPromptSchema.optional(),
    savedPromptId: z.string().min(1).optional(),
  })
  .strict();

export type GenerateRequestInput = z.infer<typeof GenerateRequestSchema>;

/** Preview reuses the generate body minus the batch fields. */
export const PreviewRequestSchema = z
  .object({
    type: ExerciseTypeSchema,
    level: GeneratorLevelSchema,
    topic: z.string().trim().min(1).max(120).optional(),
    customPrompt: CustomPromptSchema.optional(),
    savedPromptId: z.string().min(1).optional(),
  })
  .strict();

export type PreviewRequestInput = z.infer<typeof PreviewRequestSchema>;

export const SavedPromptCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
    type: ExerciseTypeSchema,
    systemPrompt: z.string().max(PROMPT_MAX).nullish(),
    userInstructions: z.string().max(PROMPT_MAX).nullish(),
  })
  .strict();

export type SavedPromptCreateInput = z.infer<typeof SavedPromptCreateSchema>;

/** Update is a partial create; at least one field must be present. */
export const SavedPromptUpdateSchema = SavedPromptCreateSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "No fields to update." },
);

export type SavedPromptUpdateInput = z.infer<typeof SavedPromptUpdateSchema>;

export const DEFAULT_PAGE_SIZE = 20;

/** Generation-history list filters (parsed from query params). */
export const SessionListQuerySchema = z
  .object({
    type: ExerciseTypeSchema.optional(),
    level: GeneratorLevelSchema.optional(),
    savedPromptId: z.string().min(1).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export type GenerateApiResponse =
  | { ok: true; result: GenerationResult }
  | { ok: false; error: string; code: string };
