import type { ExerciseIntro } from "./types";

export const freeWriting: ExerciseIntro = {
  type: "FREE_WRITING",
  whatItAsks: {
    en: "Write a short text in German about a given topic.",
    pt: "Escreva um texto curto em alemão sobre um tema dado.",
    tr: "Verilen bir konu hakkında Almanca kısa bir metin yaz.",
    uk: "Напишіть короткий текст німецькою на задану тему.",
  },
  howToInteract: {
    en: "Type at least the required number of words in the box.",
    pt: "Digite pelo menos o número de palavras pedido na caixa.",
    tr: "Kutuya en az istenen kelime sayısı kadar yaz.",
    uk: "Введіть у поле принаймні потрібну кількість слів.",
  },
  example: {
    prompt: {
      en: "Topic: *Mein Frühstück.* (At least 30 words.)",
      pt: "Tema: *Mein Frühstück.* (Pelo menos 30 palavras.)",
      tr: "Konu: *Mein Frühstück.* (En az 30 kelime.)",
      uk: "Тема: *Mein Frühstück.* (Не менше 30 слів.)",
    },
    solvedExplanation: {
      en: "Write a few sentences about what you eat for breakfast. The AI will give feedback after you submit.",
      pt: "Escreva algumas frases sobre o que você come no café da manhã. A IA dará feedback depois que você enviar.",
      tr: "Kahvaltıda ne yediğin hakkında birkaç cümle yaz. Gönderdikten sonra yapay zekâ geri bildirim verir.",
      uk: "Напишіть кілька речень про те, що ви їсте на сніданок. Після надсилання ШІ дасть зворотний зв'язок.",
    },
  },
};
