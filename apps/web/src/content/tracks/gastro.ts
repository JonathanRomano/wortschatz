import type { TrackDefinition } from "./types";

/**
 * Gastro — hospitality / gastronomy. Phrase-first German for kitchens,
 * restaurants, and hotel front desks. Five scenes from greeting a guest
 * to running the reception.
 */
export const gastro: TrackDefinition = {
  profession: "gastro",
  units: [
    {
      slug: "service",
      title: {
        en: "On the floor",
        pt: "No salão",
        tr: "Serviste",
        uk: "У залі",
      },
      level: "B1",
      topic:
        "Gastronomie: Im Service — Gäste begrüßen, Tische zuweisen, Wünsche aufnehmen",
      targetCount: 6,
    },
    {
      slug: "bestellung",
      title: {
        en: "Taking orders",
        pt: "Anotando pedidos",
        tr: "Sipariş almak",
        uk: "Приймання замовлень",
      },
      level: "B1",
      topic:
        "Gastronomie: Die Bestellung — Speisekarte erklären, Empfehlungen geben, Sonderwünsche und Allergien notieren",
      targetCount: 6,
    },
    {
      slug: "kueche",
      title: {
        en: "In the kitchen",
        pt: "Na cozinha",
        tr: "Mutfakta",
        uk: "На кухні",
      },
      level: "B1",
      topic:
        "Gastronomie: In der Küche — Zutaten, Zubereitung, Anweisungen des Küchenchefs verstehen",
      targetCount: 6,
    },
    {
      slug: "reklamation",
      title: {
        en: "Handling complaints",
        pt: "Lidando com reclamações",
        tr: "Şikâyetlerle ilgilenmek",
        uk: "Робота зі скаргами",
      },
      level: "B1",
      topic:
        "Gastronomie: Die Reklamation — sich entschuldigen, Lösungen anbieten, ruhig und höflich bleiben",
      targetCount: 6,
    },
    {
      slug: "rezeption",
      title: {
        en: "At the front desk",
        pt: "Na recepção",
        tr: "Resepsiyonda",
        uk: "На рецепції",
      },
      level: "B1",
      topic:
        "Gastronomie: An der Hotelrezeption — Check-in und Check-out, Auskünfte geben, Telefonate führen",
      targetCount: 6,
    },
  ],
};
