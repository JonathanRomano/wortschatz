import type { ExerciseIntro } from "./types";

export const verbConjugation: ExerciseIntro = {
  type: "VERB_CONJUGATION",
  whatItAsks: {
    en: "You'll see a verb in its base form. Write the correct conjugation.",
    pt: "Você verá um verbo na forma base. Escreva a conjugação correta.",
    tr: "Bir fiili kök hâlinde göreceksin. Doğru çekimini yaz.",
    uk: "Ви побачите дієслово в початковій формі. Напишіть правильну форму.",
  },
  howToInteract: {
    en: "Type the conjugated verb form.",
    pt: "Digite a forma conjugada do verbo.",
    tr: "Fiilin çekimli hâlini yaz.",
    uk: "Впишіть провідміняну форму дієслова.",
  },
  example: {
    prompt: {
      en: "Conjugate *essen* for *ich* (present tense).",
      pt: "Conjugue *essen* para *ich* (presente).",
      tr: "*essen* fiilini *ich* için çek (şimdiki zaman).",
      uk: "Провідміняйте *essen* для *ich* (теперішній час).",
    },
    solvedExplanation: {
      en: "**ich esse** — first-person singular present.",
      pt: "**ich esse** — primeira pessoa do singular no presente.",
      tr: "**ich esse** — şimdiki zaman, birinci tekil şahıs.",
      uk: "**ich esse** — перша особа однини теперішнього часу.",
    },
  },
};
