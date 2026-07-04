import type { ProfessionSlug } from "@wortschatz/config";

import { pflege } from "./pflege";
import { it } from "./it";
import { gastro } from "./gastro";
import { handwerk } from "./handwerk";
import type { TrackDefinition, TrackUnit } from "./types";

export type { TrackDefinition, TrackUnit } from "./types";

/**
 * Every career track, keyed by profession slug (Sprint 05). Static
 * content — expanding a track (more units, new levels) or adding a
 * profession's track is an edit here plus generated exercises, never a
 * migration. The Record type ensures a new PROFESSION_SLUGS entry
 * fails the build until its track exists.
 */
export const TRACKS: Record<ProfessionSlug, TrackDefinition> = {
  pflege,
  it,
  gastro,
  handwerk,
};

/** All units across all tracks — seed script + tests iterate this. */
export function allUnits(): Array<{
  profession: ProfessionSlug;
  unit: TrackUnit;
}> {
  return (Object.keys(TRACKS) as ProfessionSlug[]).flatMap((profession) =>
    TRACKS[profession].units.map((unit) => ({ profession, unit })),
  );
}
