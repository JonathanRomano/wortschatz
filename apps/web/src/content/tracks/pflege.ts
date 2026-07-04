import type { TrackDefinition } from "./types";

/**
 * Pflege — healthcare / care work. The classic "German to work in
 * Germany fast" audience: nurses and caregivers heading for B1/B2 and
 * Anerkennung. Five scenes of a ward shift, in chronological order.
 */
export const pflege: TrackDefinition = {
  profession: "pflege",
  units: [
    {
      slug: "stationsalltag",
      title: {
        en: "Daily life on the ward",
        pt: "O dia a dia na enfermaria",
        tr: "Serviste günlük yaşam",
        uk: "Будні у відділенні",
      },
      level: "B1",
      topic:
        "Pflege: Der Stationsalltag — Schichtbeginn, Stationszimmer, Geräte und das Team begrüßen",
      targetCount: 6,
    },
    {
      slug: "patientengespraech",
      title: {
        en: "Talking with patients",
        pt: "Conversando com pacientes",
        tr: "Hastalarla konuşmak",
        uk: "Розмова з пацієнтами",
      },
      level: "B1",
      topic:
        "Pflege: Das Patientengespräch — Schmerzen erfragen, beruhigen, Alltagsbedürfnisse klären",
      targetCount: 6,
    },
    {
      slug: "medikamente",
      title: {
        en: "Medication & documentation",
        pt: "Medicamentos e documentação",
        tr: "İlaçlar ve dokümantasyon",
        uk: "Ліки та документація",
      },
      level: "B1",
      topic:
        "Pflege: Medikamente verabreichen und dokumentieren — Dosierung, Uhrzeiten, Pflegebericht schreiben",
      targetCount: 6,
    },
    {
      slug: "uebergabe",
      title: {
        en: "The shift handover",
        pt: "A passagem de plantão",
        tr: "Vardiya devri",
        uk: "Передача зміни",
      },
      level: "B1",
      topic:
        "Pflege: Die Übergabe an die nächste Schicht — Zustand der Patienten berichten, Besonderheiten und Anweisungen weitergeben",
      targetCount: 6,
    },
    {
      slug: "notfall",
      title: {
        en: "Emergencies",
        pt: "Emergências",
        tr: "Acil durumlar",
        uk: "Невідкладні випадки",
      },
      level: "B1",
      topic:
        "Pflege: Der Notfall auf Station — Hilfe rufen, den Arzt informieren, klare Anweisungen verstehen",
      targetCount: 6,
    },
  ],
};
