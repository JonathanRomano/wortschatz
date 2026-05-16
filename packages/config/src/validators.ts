/**
 * Reusable Zod schemas for request-body validation. Kept generic — no
 * Prisma or Express imports — so both apps can use them.
 */
import { z } from "zod";

import { COMMENT_MAX_LENGTH, SUPPORTED_LOCALES } from "./constants.js";

export const localeSchema = z.enum(SUPPORTED_LOCALES);

export const cefrLevelSchema = z.enum([
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const);

export const exerciseTypeSchema = z.enum([
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
] as const);

export const commentBodySchema = z
  .string()
  .min(1, "comment must not be empty")
  .max(COMMENT_MAX_LENGTH, `comment must be at most ${COMMENT_MAX_LENGTH} chars`);

export const reviewTextSchema = z
  .string()
  .min(1, "text must not be empty")
  .max(5000, "text must be at most 5000 chars");
