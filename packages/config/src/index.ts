/**
 * @wortschatz/config — shared constants, env schemas, utilities.
 *
 * Used by both apps/web and apps/api. Pure values + zod schemas + small
 * utilities; no Prisma, no SDK clients, no side effects on import.
 */
export * from "./constants.js";
export * from "./env.js";
export * from "./validators.js";
export * from "./utils.js";
