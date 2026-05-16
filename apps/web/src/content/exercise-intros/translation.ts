import type { ExerciseIntro } from "./types";

export const translation: ExerciseIntro = {
  type: "TRANSLATION",
  whatItAsks: {
    en: "You'll see a sentence in English (or another language). Translate it into German.",
    pt: "Você verá uma frase em inglês (ou outro idioma). Traduza-a para o alemão.",
    tr: "İngilizce (veya başka bir dilde) bir cümle göreceksin. Onu Almancaya çevir.",
    uk: "Ви побачите речення англійською (або іншою мовою). Перекладіть його німецькою.",
  },
  howToInteract: {
    en: "Type the German translation in the text box.",
    pt: "Digite a tradução em alemão na caixa de texto.",
    tr: "Almanca çeviriyi metin kutusuna yaz.",
    uk: "Введіть німецький переклад у текстовому полі.",
  },
  example: {
    prompt: {
      en: "Translate: *I eat an apple.*",
      pt: "Traduza: *Eu como uma maçã.*",
      tr: "Çevir: *Bir elma yiyorum.*",
      uk: "Перекладіть: *Я їм яблуко.*",
    },
    solvedExplanation: {
      en: "**Ich esse einen Apfel.** — 'einen' is the accusative form for masculine nouns.",
      pt: "**Ich esse einen Apfel.** — 'einen' é a forma acusativa de nomes masculinos.",
      tr: "**Ich esse einen Apfel.** — 'einen' eril isimler için belirtme (akkusativ) hâlidir.",
      uk: "**Ich esse einen Apfel.** — 'einen' — це знахідний відмінок для іменників чоловічого роду.",
    },
  },
};
