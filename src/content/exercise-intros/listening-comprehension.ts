import type { ExerciseIntro } from "./types";

export const listeningComprehension: ExerciseIntro = {
  type: "LISTENING_COMPREHENSION",
  whatItAsks: {
    en: "Listen to a short German audio (or read the transcript), then answer a question.",
    pt: "Ouça um áudio curto em alemão (ou leia a transcrição) e depois responda a uma pergunta.",
    tr: "Kısa bir Almanca sesi dinle (ya da transkripti oku), sonra bir soruyu cevapla.",
    uk: "Прослухайте коротке аудіо німецькою (або прочитайте розшифровку) і дайте відповідь на запитання.",
  },
  howToInteract: {
    en: "Play the audio (or read the transcript), then type your answer.",
    pt: "Reproduza o áudio (ou leia a transcrição) e depois digite sua resposta.",
    tr: "Sesi oynat (ya da transkripti oku), sonra cevabını yaz.",
    uk: "Запустіть аудіо (або прочитайте розшифровку), потім впишіть свою відповідь.",
  },
  example: {
    prompt: {
      en: "Audio: *'Ich gehe heute in den Supermarkt.'*  Question: Where is the person going?",
      pt: "Áudio: *'Ich gehe heute in den Supermarkt.'*  Pergunta: Para onde a pessoa vai?",
      tr: "Ses: *'Ich gehe heute in den Supermarkt.'*  Soru: Kişi nereye gidiyor?",
      uk: "Аудіо: *'Ich gehe heute in den Supermarkt.'*  Запитання: Куди йде ця людина?",
    },
    solvedExplanation: {
      en: "**To the supermarket** — 'in den Supermarkt'.",
      pt: "**Ao supermercado** — 'in den Supermarkt'.",
      tr: "**Süpermarkete** — 'in den Supermarkt'.",
      uk: "**До супермаркету** — 'in den Supermarkt'.",
    },
  },
};
