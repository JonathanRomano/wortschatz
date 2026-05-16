import type { ExerciseIntro } from "./types";

export const fillInTheBlank: ExerciseIntro = {
  type: "FILL_IN_THE_BLANK",
  whatItAsks: {
    en: "You'll see a sentence in German with one or more blanks. Type the missing word.",
    pt: "Você verá uma frase em alemão com uma ou mais lacunas. Digite a palavra que falta.",
    tr: "Almanca bir cümlede bir veya birkaç boşluk göreceksin. Eksik kelimeyi yaz.",
    uk: "Ви побачите речення німецькою з одним або кількома пропусками. Напишіть пропущене слово.",
  },
  howToInteract: {
    en: "Click each blank and type your answer.",
    pt: "Clique em cada lacuna e digite sua resposta.",
    tr: "Her boşluğa tıkla ve cevabını yaz.",
    uk: "Натисніть на кожен пропуск і впишіть свою відповідь.",
  },
  example: {
    prompt: {
      en: "Sentence: *Ich ___ einen Apfel.* (Verb 'essen'.)",
      pt: "Frase: *Ich ___ einen Apfel.* (Verbo 'essen'.)",
      tr: "Cümle: *Ich ___ einen Apfel.* ('essen' fiili.)",
      uk: "Речення: *Ich ___ einen Apfel.* (Дієслово 'essen'.)",
    },
    solvedExplanation: {
      en: "The blank is **esse** — 'ich esse' means 'I eat'.",
      pt: "A lacuna é **esse** — 'ich esse' significa 'eu como'.",
      tr: "Boşluk **esse** — 'ich esse' yani 'ben yiyorum'.",
      uk: "Пропуск — **esse**: 'ich esse' означає 'я їм'.",
    },
  },
};
