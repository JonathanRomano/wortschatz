import type { TrackDefinition } from "./types";

/**
 * Handwerk — construction, trades, and logistics. The skilled-worker
 * visa audience: building sites, workshops, warehouses, delivery
 * routes. Safety language gets its own unit on purpose.
 */
export const handwerk: TrackDefinition = {
  profession: "handwerk",
  units: [
    {
      slug: "baustelle",
      title: {
        en: "On the site",
        pt: "Na obra",
        tr: "Şantiyede",
        uk: "На будмайданчику",
      },
      level: "B1",
      topic:
        "Handwerk: Auf der Baustelle — Werkzeuge, Materialien, Anweisungen des Poliers verstehen",
      targetCount: 6,
    },
    {
      slug: "sicherheit",
      title: {
        en: "Safety first",
        pt: "Segurança em primeiro lugar",
        tr: "Önce iş güvenliği",
        uk: "Безпека понад усе",
      },
      level: "B1",
      topic:
        "Handwerk: Arbeitssicherheit — Schutzausrüstung, Warnhinweise lesen, Unfälle und Gefahren melden",
      targetCount: 6,
    },
    {
      slug: "auftrag",
      title: {
        en: "The job order",
        pt: "A ordem de serviço",
        tr: "İş emri",
        uk: "Робоче завдання",
      },
      level: "B1",
      topic:
        "Handwerk: Der Auftrag — Arbeitsauftrag lesen, Zeitplan besprechen, Rückfragen stellen",
      targetCount: 6,
    },
    {
      slug: "kunden",
      title: {
        en: "With the customer",
        pt: "Com o cliente",
        tr: "Müşteride",
        uk: "У клієнта",
      },
      level: "B1",
      topic:
        "Handwerk: Beim Kunden — Arbeiten erklären, Kosten nennen, Termine vereinbaren",
      targetCount: 6,
    },
    {
      slug: "lager",
      title: {
        en: "Warehouse & delivery",
        pt: "Armazém e entrega",
        tr: "Depo ve teslimat",
        uk: "Склад і доставка",
      },
      level: "B1",
      topic:
        "Handwerk: Lager und Lieferung — Lieferschein prüfen, Bestände melden, Touren planen",
      targetCount: 6,
    },
  ],
};
