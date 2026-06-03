import { Router } from "express";
import { z } from "zod";

import {
  cefrLevelSchema,
  exerciseTypeSchema,
  reviewTextSchema,
} from "@wortschatz/config";
import { prisma } from "@wortschatz/database";

import { sharedSecretAuth } from "../middleware/auth.js";
import { evaluateAnswer, reviewText } from "../services/claude.js";
import { generateExercise } from "../services/generate.js";

const router = Router();

router.use(sharedSecretAuth);

// --- POST /ai/review-text ---------------------------------------------

const reviewBodySchema = z.object({
  text: reviewTextSchema,
  level: cefrLevelSchema.default("B1"),
});

router.post("/review-text", async (req, res, next) => {
  try {
    const { text, level } = reviewBodySchema.parse(req.body);
    const result = await reviewText(text, level, req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- POST /ai/evaluate-answer -----------------------------------------
//
// Web supplies the exercise as Pick<Exercise, "type" | "content" | "solution">
// rather than just the exercise id, so the API doesn't have to fetch the
// row (and the caller can grade an unsaved generated exercise).

const evaluateBodySchema = z.object({
  exercise: z.object({
    type: exerciseTypeSchema,
    content: z.record(z.unknown()),
    solution: z.record(z.unknown()),
  }),
  userAnswer: z.unknown(),
});

router.post("/evaluate-answer", async (req, res, next) => {
  try {
    const { exercise, userAnswer } = evaluateBodySchema.parse(req.body);
    const result = await evaluateAnswer(exercise, userAnswer, req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- POST /ai/evaluate-answer-by-id -----------------------------------
//
// Convenience variant for callers that already persisted the exercise.

const evaluateByIdSchema = z.object({
  exerciseId: z.string().min(1),
  userAnswer: z.unknown(),
});

router.post("/evaluate-answer-by-id", async (req, res, next) => {
  try {
    const { exerciseId, userAnswer } = evaluateByIdSchema.parse(req.body);
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { type: true, content: true, solution: true },
    });
    if (!exercise) {
      res.status(404).json({ error: "exercise_not_found" });
      return;
    }
    const result = await evaluateAnswer(exercise, userAnswer, req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- POST /ai/generate-exercise ---------------------------------------
//
// Full-ownership generation (sprint Task 2.1). apps/api builds the prompt,
// calls the provider, validates the output against the canonical per-type
// schemas in @wortschatz/exercises, and returns the validated exercise.
// The web's runGeneration resolves the topic, fetches recent examples,
// inserts the row, and owns the GenerationSession — see ARCHITECTURE.md.

const generateBodySchema = z.object({
  type: exerciseTypeSchema,
  level: cefrLevelSchema.default("B1"),
  topic: z.string().min(1).max(200),
  recentExamples: z
    .array(z.object({ title: z.string(), excerpt: z.string() }))
    .default([]),
  customPrompt: z
    .object({
      system: z.string().optional(),
      userInstructions: z.string().optional(),
    })
    .optional(),
  provider: z.enum(["claude", "gpt"]).default("claude"),
  model: z.string().optional(),
});

router.post("/generate-exercise", async (req, res, next) => {
  try {
    const body = generateBodySchema.parse(req.body);
    const outcome = await generateExercise({ ...body, userId: req.userId });
    if (!outcome.ok) {
      // Model output didn't parse / validate — a content miss, not a
      // server fault. 422 so the caller can record it as a per-item
      // validation failure and move on.
      res.status(422).json({
        error: "validation_failed",
        code: "validation_failed",
        errors: outcome.errors,
      });
      return;
    }
    res.json(outcome.exercise);
  } catch (err) {
    // ZodError → 400, AiRateLimitedError → 429, anything else → 500.
    next(err);
  }
});

export { router as aiRouter };
