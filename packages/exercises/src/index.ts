/**
 * @wortschatz/exercises — the shared exercise-generation domain package.
 *
 * Holds everything BOTH apps need to generate and validate exercises:
 * the per-type Zod content/solution schemas, the prompt-builder + per-type
 * prompt sets (claude + gpt), recent-example rendering, JSON extraction,
 * and the validation gate.
 *
 * Pure TypeScript — no Prisma client, no SDK, no Next/Express. The only
 * dependency on @wortschatz/database is the `ExerciseType` / `CefrLevel`
 * enum *types* (erased at runtime). DB-coupled helpers (fetchRecentExamples,
 * insert, session) stay in apps/web/scripts.
 */
export * from "./schemas.js";
export * from "./prompt-types.js";
export * from "./prompt-override.js";
export * from "./api-contracts.js";
export * from "./json.js";
export * from "./recent-block.js";
export * from "./prompt-builder.js";
export * from "./validate.js";
export { claudePrompts } from "./prompts/claude/index.js";
export { gptPrompts } from "./prompts/gpt/index.js";
