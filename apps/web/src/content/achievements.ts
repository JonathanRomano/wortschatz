import type { LocalizedText } from "@wortschatz/types";

/**
 * Overnight loop iter 16. Achievement badges derived purely from existing
 * progress data (no persistence, no migration). Copy lives here as
 * LocalizedText — same pattern as the exercise intros — so adding a badge or
 * tweaking wording is a one-file change and doesn't touch messages/*.json.
 * A persisted "unlocked-at" timestamp (for toasts) would be the migration
 * follow-up; this ships the read-only derived shelf first.
 */

export type AchievementStats = {
  /** Exercises passed (score ≥ 60), counting attempts. */
  totalPassed: number;
  /** Perfect scores (score === 100). */
  perfectCount: number;
  /** Best consecutive-day streak in the tracked window. */
  longestStreak: number;
  /** Days the learner met their daily goal in the window. */
  goalMetDays: number;
  /** Distinct exercise types the learner has attempted. */
  typesTried: number;
};

export type Achievement = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  earned: boolean;
};

type AchievementDef = Omit<Achievement, "earned"> & {
  isEarned: (s: AchievementStats) => boolean;
};

const DEFS: AchievementDef[] = [
  {
    id: "first-win",
    title: {
      en: "First win",
      pt: "Primeira vitória",
      tr: "İlk zafer",
      uk: "Перша перемога",
    },
    description: {
      en: "Pass your first exercise.",
      pt: "Passe no seu primeiro exercício.",
      tr: "İlk alıştırmanı geç.",
      uk: "Склади свою першу вправу.",
    },
    isEarned: (s) => s.totalPassed >= 1,
  },
  {
    id: "dedicated",
    title: {
      en: "Dedicated",
      pt: "Dedicado",
      tr: "Azimli",
      uk: "Відданий",
    },
    description: {
      en: "Meet your daily goal on 10 days.",
      pt: "Cumpra a meta diária em 10 dias.",
      tr: "10 gün günlük hedefine ulaş.",
      uk: "Досягни денної мети 10 днів.",
    },
    isEarned: (s) => s.goalMetDays >= 10,
  },
  {
    id: "week-streak",
    title: {
      en: "Week warrior",
      pt: "Guerreiro da semana",
      tr: "Hafta savaşçısı",
      uk: "Воїн тижня",
    },
    description: {
      en: "Reach a 7-day streak.",
      pt: "Alcance uma sequência de 7 dias.",
      tr: "7 günlük seriye ulaş.",
      uk: "Досягни серії у 7 днів.",
    },
    isEarned: (s) => s.longestStreak >= 7,
  },
  {
    id: "flawless",
    title: {
      en: "Flawless",
      pt: "Impecável",
      tr: "Kusursuz",
      uk: "Бездоганний",
    },
    description: {
      en: "Score 100% on 10 exercises.",
      pt: "Acerte 100% em 10 exercícios.",
      tr: "10 alıştırmada %100 al.",
      uk: "Набери 100% у 10 вправах.",
    },
    isEarned: (s) => s.perfectCount >= 10,
  },
  {
    id: "explorer",
    title: {
      en: "Explorer",
      pt: "Explorador",
      tr: "Kâşif",
      uk: "Дослідник",
    },
    description: {
      en: "Try all 10 exercise types.",
      pt: "Experimente os 10 tipos de exercício.",
      tr: "10 alıştırma türünün hepsini dene.",
      uk: "Спробуй усі 10 типів вправ.",
    },
    isEarned: (s) => s.typesTried >= 10,
  },
  {
    id: "centurion",
    title: {
      en: "Centurion",
      pt: "Centurião",
      tr: "Yüzbaşı",
      uk: "Сотник",
    },
    description: {
      en: "Pass 100 exercises.",
      pt: "Passe em 100 exercícios.",
      tr: "100 alıştırmayı geç.",
      uk: "Склади 100 вправ.",
    },
    isEarned: (s) => s.totalPassed >= 100,
  },
];

/** All achievements with their earned state for the given stats. Order stable. */
export function deriveAchievements(stats: AchievementStats): Achievement[] {
  return DEFS.map(({ isEarned, ...rest }) => ({
    ...rest,
    earned: isEarned(stats),
  }));
}

/** How many of the achievements are earned for the given stats. */
export function countEarned(stats: AchievementStats): number {
  return DEFS.reduce((n, d) => (d.isEarned(stats) ? n + 1 : n), 0);
}

/** Total number of achievements (for "X of Y" chrome). */
export const ACHIEVEMENT_COUNT = DEFS.length;
