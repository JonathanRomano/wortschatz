/**
 * Server-side serialization for the base-prompt curation API.
 *
 * Shapes Prisma rows into the wire DTOs declared in ./client (so the browser
 * and the routes agree), and renders the code-locked jsonShape/rules blocks
 * for read-only display in the editor. The locked blocks are NOT stored in
 * the DB — they live in the per-type prompt file (DB-first decision) — so the
 * editor shows them from `claudePrompts`, never lets them be edited.
 */
import type { CefrLevel, ExerciseType, Prisma } from "@wortschatz/database";
import { claudePrompts } from "@wortschatz/exercises";

import type {
  BasePromptDetail,
  BasePromptListItem,
  BasePromptVersionDTO,
  LockedBlocks,
} from "./client";

/** The author fields every version row carries for display. */
export const versionAuthorSelect = {
  select: { id: true, email: true, role: true },
} as const;

type VersionRow = Prisma.BasePromptVersionGetPayload<{
  include: { author: typeof versionAuthorSelect };
}>;

type BasePromptRow = Prisma.BasePromptGetPayload<{
  include: { versions: { include: { author: typeof versionAuthorSelect } } };
}>;

export function serializeVersion(v: VersionRow): BasePromptVersionDTO {
  return {
    id: v.id,
    versionNumber: v.versionNumber,
    status: v.status,
    systemPrompt: v.systemPrompt,
    userInstructions: v.userInstructions,
    changeNote: v.changeNote,
    authorId: v.authorId,
    authorEmail: v.author?.email ?? null,
    authorRole: v.author?.role ?? null,
    createdAt: v.createdAt.toISOString(),
    publishedAt: v.publishedAt?.toISOString() ?? null,
    deactivatedAt: v.deactivatedAt?.toISOString() ?? null,
  };
}

/** Versions ordered latest-first (highest versionNumber first). */
function orderedVersions(bp: BasePromptRow): VersionRow[] {
  return [...bp.versions].sort((a, b) => b.versionNumber - a.versionNumber);
}

export function serializeListItem(bp: BasePromptRow): BasePromptListItem {
  const versions = orderedVersions(bp);
  const active = versions.find((v) => v.status === "ACTIVE") ?? null;
  const draft = versions.find((v) => v.status === "DRAFT") ?? null;
  const latest = versions[0] ?? null;
  return {
    id: bp.id,
    type: bp.type,
    level: bp.level,
    description: bp.description,
    activeVersionNumber: active?.versionNumber ?? null,
    hasDraftPending: draft !== null,
    draftVersionId: draft?.id ?? null,
    lastEditedAt: latest?.createdAt.toISOString() ?? null,
    lastEditedByEmail: latest?.author?.email ?? null,
    lastEditedByRole: latest?.author?.role ?? null,
  };
}

export function serializeDetail(bp: BasePromptRow): BasePromptDetail {
  const versions = orderedVersions(bp);
  const active = versions.find((v) => v.status === "ACTIVE") ?? null;
  return {
    id: bp.id,
    type: bp.type,
    level: bp.level,
    description: bp.description,
    activeVersion: active ? serializeVersion(active) : null,
    versions: versions.map(serializeVersion),
    locked: renderLockedBlocks(bp.type, bp.level),
  };
}

/**
 * Render the locked jsonShape + rules for this (type, level) from the
 * hardcoded prompt file, for read-only display. `{topic}` is left as a
 * visible placeholder since no concrete topic exists at edit time.
 */
export function renderLockedBlocks(
  type: ExerciseType,
  level: CefrLevel,
): LockedBlocks {
  const parts = claudePrompts[type];
  const input = { level, topic: "{topic}", recentExamples: [] };
  return { jsonShape: parts.jsonShape(input), rules: parts.rules(input) };
}
