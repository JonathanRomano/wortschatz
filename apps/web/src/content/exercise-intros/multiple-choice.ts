import type { ExerciseIntro } from "./types";

export const multipleChoice: ExerciseIntro = {
  type: "MULTIPLE_CHOICE",
  whatItAsks: {
    en: "You'll see a question and several options. Pick the correct one.",
    pt: "Você verá uma pergunta e várias opções. Escolha a correta.",
    tr: "Bir soru ve birkaç seçenek göreceksin. Doğru olanı seç.",
    uk: "Ви побачите запитання та кілька варіантів. Оберіть правильний.",
  },
  howToInteract: {
    en: "Click an option, then press Submit.",
    pt: "Clique numa opção e depois pressione Enviar.",
    tr: "Bir seçeneğe tıkla, sonra Gönder'e bas.",
    uk: "Натисніть на варіант, потім натисніть «Надіслати».",
  },
  example: {
    prompt: {
      en: "What is 'apple' in German?  • der Apfel  • die Birne  • die Banane",
      pt: "Qual é a palavra alemã para 'maçã'?  • der Apfel  • die Birne  • die Banane",
      tr: "Almancada 'elma' nedir?  • der Apfel  • die Birne  • die Banane",
      uk: "Як буде 'яблуко' німецькою?  • der Apfel  • die Birne  • die Banane",
    },
    solvedExplanation: {
      en: "**der Apfel** is correct — 'Apfel' means apple.",
      pt: "**der Apfel** é a correta — 'Apfel' significa maçã.",
      tr: "**der Apfel** doğru — 'Apfel' elma demek.",
      uk: "**der Apfel** — правильна відповідь, 'Apfel' означає яблуко.",
    },
  },
};
