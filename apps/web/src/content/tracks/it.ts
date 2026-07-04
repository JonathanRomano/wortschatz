import type { TrackDefinition } from "./types";

/**
 * IT / engineering. These teams often work in English — the German that
 * actually blocks people is meetings, feedback, and paperwork. Five
 * scenes from sprint ritual to HR bureaucracy.
 */
export const it: TrackDefinition = {
  profession: "it",
  units: [
    {
      slug: "standup",
      title: {
        en: "The daily standup",
        pt: "A daily",
        tr: "Günlük standup",
        uk: "Щоденний стендап",
      },
      level: "B1",
      topic:
        "IT: Das Daily Standup — Fortschritt berichten, Blocker benennen, Aufgaben für den Tag planen",
      targetCount: 6,
    },
    {
      slug: "codereview",
      title: {
        en: "Code review & feedback",
        pt: "Code review e feedback",
        tr: "Kod incelemesi ve geri bildirim",
        uk: "Код-рев'ю та зворотний зв'язок",
      },
      level: "B1",
      topic:
        "IT: Code-Review und Feedback — höflich Kritik üben, Vorschläge machen, Entscheidungen begründen",
      targetCount: 6,
    },
    {
      slug: "tickets",
      title: {
        en: "Tickets & bugs",
        pt: "Tickets e bugs",
        tr: "Ticket'lar ve hatalar",
        uk: "Тікети та баги",
      },
      level: "B1",
      topic:
        "IT: Tickets und Bugs — Probleme präzise beschreiben, Prioritäten klären, Lösungen dokumentieren",
      targetCount: 6,
    },
    {
      slug: "meetings",
      title: {
        en: "Meetings & agreements",
        pt: "Reuniões e combinados",
        tr: "Toplantılar ve mutabakatlar",
        uk: "Зустрічі та домовленості",
      },
      level: "B1",
      topic:
        "IT: Meetings und Absprachen — Termine vereinbaren, Protokolle verstehen, Nachfragen stellen",
      targetCount: 6,
    },
    {
      slug: "buerokratie",
      title: {
        en: "Office life & paperwork",
        pt: "Escritório e burocracia",
        tr: "Ofis hayatı ve evrak işleri",
        uk: "Офісні будні та бюрократія",
      },
      level: "B1",
      topic:
        "IT: Büroalltag und Bürokratie — Arbeitsvertrag, Urlaub beantragen, mit der Personalabteilung kommunizieren",
      targetCount: 6,
    },
  ],
};
