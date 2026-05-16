import type { ExerciseIntro } from "./types";

export const errorCorrection: ExerciseIntro = {
  type: "ERROR_CORRECTION",
  whatItAsks: {
    en: "A German sentence has one mistake. Find it and rewrite the sentence correctly.",
    pt: "Uma frase em alemão tem um erro. Encontre-o e reescreva a frase corretamente.",
    tr: "Almanca bir cümlede bir hata var. Bulup cümleyi doğru biçimde tekrar yaz.",
    uk: "У німецькому реченні є одна помилка. Знайдіть її та перепишіть речення правильно.",
  },
  howToInteract: {
    en: "Type the corrected sentence in the box.",
    pt: "Digite a frase corrigida na caixa.",
    tr: "Düzeltilmiş cümleyi kutuya yaz.",
    uk: "Впишіть виправлене речення в поле.",
  },
  example: {
    prompt: {
      en: "Sentence: *Ich esse ein Apfel.*",
      pt: "Frase: *Ich esse ein Apfel.*",
      tr: "Cümle: *Ich esse ein Apfel.*",
      uk: "Речення: *Ich esse ein Apfel.*",
    },
    solvedExplanation: {
      en: "**Ich esse einen Apfel.** — 'ein' should be 'einen' (accusative masculine).",
      pt: "**Ich esse einen Apfel.** — 'ein' deveria ser 'einen' (acusativo masculino).",
      tr: "**Ich esse einen Apfel.** — 'ein' yerine 'einen' olmalı (eril akkusativ).",
      uk: "**Ich esse einen Apfel.** — 'ein' має бути 'einen' (знахідний відмінок чоловічого роду).",
    },
  },
};
