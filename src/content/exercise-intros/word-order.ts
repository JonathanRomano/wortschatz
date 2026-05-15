import type { ExerciseIntro } from "./types";

export const wordOrder: ExerciseIntro = {
  type: "WORD_ORDER",
  whatItAsks: {
    en: "The words of a German sentence are mixed up. Put them in the correct order.",
    pt: "As palavras de uma frase em alemão estão fora de ordem. Coloque-as na ordem correta.",
    tr: "Bir Almanca cümlenin kelimeleri karışmış. Onları doğru sıraya koy.",
    uk: "Слова німецького речення переплутані. Розставте їх у правильному порядку.",
  },
  howToInteract: {
    en: "Tap each word to add it to the sentence. Tap a chosen word again to remove it.",
    pt: "Toque em cada palavra para adicioná-la à frase. Toque novamente para removê-la.",
    tr: "Cümleye eklemek için her kelimeye dokun. Çıkarmak için seçili kelimeye tekrar dokun.",
    uk: "Натискайте на кожне слово, щоб додати його до речення. Натисніть на обране слово ще раз, щоб прибрати.",
  },
  example: {
    prompt: {
      en: "Words: *Apfel · esse · Ich · einen*",
      pt: "Palavras: *Apfel · esse · Ich · einen*",
      tr: "Kelimeler: *Apfel · esse · Ich · einen*",
      uk: "Слова: *Apfel · esse · Ich · einen*",
    },
    solvedExplanation: {
      en: "Order: **Ich esse einen Apfel** — subject, verb, then object.",
      pt: "Ordem: **Ich esse einen Apfel** — sujeito, verbo e depois objeto.",
      tr: "Sıra: **Ich esse einen Apfel** — özne, fiil, sonra nesne.",
      uk: "Порядок: **Ich esse einen Apfel** — підмет, дієслово, далі додаток.",
    },
  },
};
