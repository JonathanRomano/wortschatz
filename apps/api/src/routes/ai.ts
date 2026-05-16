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
// 501 stub: the per-type Zod content/solution schemas still live in
// apps/web/src/lib/exercises/schemas.ts. Moving them into a shared
// package (probably @wortschatz/exercises) is out of scope for Sprint
// 03. Admin generation continues to run via
// apps/web/scripts/generate-exercises.ts, which calls Claude directly.

router.post("/generate-exercise", async (_req, res) => {
  res.status(501).json({
    error: "not_implemented",
    detail:
      "generateExercise is currently served by apps/web/scripts/generate-exercises.ts. " +
      "Exposing it via the API requires extracting the per-type Zod schemas from " +
      "apps/web/src/lib/exercises/schemas.ts into a shared package.",
  });
});

export { router as aiRouter };
