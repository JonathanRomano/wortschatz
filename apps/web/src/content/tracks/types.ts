import type { CefrLevel } from "@wortschatz/database";
import type { LocalizedText } from "@wortschatz/types";
import type { ProfessionSlug } from "@wortschatz/config";

/**
 * One unit of a career track ("Dein Weg", Sprint 05). Static content,
 * same philosophy as `content/exercise-intros`: editing the curriculum
 * is a code change, not a DB migration.
 */
export interface TrackUnit {
  /**
   * Stable id. Doubles as the generation topic key: exercises belonging
   * to this unit carry the `unit:<slug>` tag (stamped by the generator,
   * Task 4). Must be globally unique across all tracks.
   */
  slug: string;
  /** Card title on the track page. */
  title: LocalizedText;
  /** CEFR level of the unit's exercises. v1 curricula are all B1. */
  level: CefrLevel;
  /**
   * German topic string handed to the exercise generator verbatim. This
   * is where the workplace context lives — the prompt seam itself stays
   * untouched (see SPRINT_05.md design overview).
   */
  topic: string;
  /** Distinct passed exercises required to complete the unit. */
  targetCount: number;
}

export interface TrackDefinition {
  profession: ProfessionSlug;
  /** Ordered — units unlock sequentially on the track page. */
  units: TrackUnit[];
}
