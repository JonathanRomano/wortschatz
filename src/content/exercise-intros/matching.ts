import type { ExerciseIntro } from "./types";

export const matching: ExerciseIntro = {
  type: "MATCHING",
  whatItAsks: {
    en: "Match the German words to their meanings.",
    pt: "Combine as palavras em alemão com seus significados.",
    tr: "Almanca kelimeleri anlamlarıyla eşleştir.",
    uk: "Зіставте німецькі слова з їх значеннями.",
  },
  howToInteract: {
    en: "Choose the matching meaning from the dropdown next to each German word.",
    pt: "Escolha o significado correspondente no menu ao lado de cada palavra alemã.",
    tr: "Her Almanca kelimenin yanındaki açılır menüden eşleşen anlamı seç.",
    uk: "Оберіть відповідне значення у списку поруч із кожним німецьким словом.",
  },
  example: {
    prompt: {
      en: "Match: *Apfel · Birne · Banane* to *apple · pear · banana*",
      pt: "Combine: *Apfel · Birne · Banane* com *maçã · pera · banana*",
      tr: "Eşleştir: *Apfel · Birne · Banane* ile *elma · armut · muz*",
      uk: "Зіставте: *Apfel · Birne · Banane* з *яблуко · груша · банан*",
    },
    solvedExplanation: {
      en: "Apfel→apple, Birne→pear, Banane→banana.",
      pt: "Apfel→maçã, Birne→pera, Banane→banana.",
      tr: "Apfel→elma, Birne→armut, Banane→muz.",
      uk: "Apfel→яблуко, Birne→груша, Banane→банан.",
    },
  },
};
