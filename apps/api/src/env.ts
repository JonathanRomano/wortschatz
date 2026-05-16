import dotenv from "dotenv";
import { apiEnvSchema, type ApiEnv } from "@wortschatz/config";

dotenv.config();

const parsed = apiEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[api] env validation failed:", parsed.error.format());
  process.exit(1);
}

export const env: ApiEnv = parsed.data;

/** True iff ANTHROPIC_API_KEY is set. AI routes branch on this. */
export const AI_CONFIGURED = Boolean(process.env.ANTHROPIC_API_KEY);

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
