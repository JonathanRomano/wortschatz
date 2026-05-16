import type { ExerciseIntro } from "./types";

export const readingComprehension: ExerciseIntro = {
  type: "READING_COMPREHENSION",
  whatItAsks: {
    en: "Read a short German text, then answer a question about it.",
    pt: "Leia um texto curto em alemão e depois responda a uma pergunta sobre ele.",
    tr: "Kısa bir Almanca metni oku, sonra onunla ilgili bir soruyu cevapla.",
    uk: "Прочитайте короткий німецький текст і дайте відповідь на запитання за ним.",
  },
  howToInteract: {
    en: "Read the passage carefully, then type your answer in the box.",
    pt: "Leia o trecho com atenção e depois digite sua resposta na caixa.",
    tr: "Metni dikkatlice oku, sonra cevabını kutuya yaz.",
    uk: "Уважно прочитайте уривок, потім впишіть свою відповідь у поле.",
  },
  example: {
    prompt: {
      en: "Text: *'Anna wohnt in Berlin. Sie arbeitet als Lehrerin.'*  Question: What is Anna's job?",
      pt: "Texto: *'Anna wohnt in Berlin. Sie arbeitet als Lehrerin.'*  Pergunta: Qual é a profissão da Anna?",
      tr: "Metin: *'Anna wohnt in Berlin. Sie arbeitet als Lehrerin.'*  Soru: Anna'nın işi ne?",
      uk: "Текст: *'Anna wohnt in Berlin. Sie arbeitet als Lehrerin.'*  Запитання: Ким працює Анна?",
    },
    solvedExplanation: {
      en: "**Lehrerin (teacher)** — 'sie arbeitet als Lehrerin'.",
      pt: "**Lehrerin (professora)** — 'sie arbeitet als Lehrerin'.",
      tr: "**Lehrerin (öğretmen)** — 'sie arbeitet als Lehrerin'.",
      uk: "**Lehrerin (вчителька)** — 'sie arbeitet als Lehrerin'.",
    },
  },
};
