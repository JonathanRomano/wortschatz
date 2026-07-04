import { describe, it, expect } from "vitest";
import { PROFESSION_SLUGS } from "@wortschatz/config";

import { TRACKS, allUnits } from "@/content/tracks";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LOCALES = ["en", "pt", "tr", "uk"] as const;

describe("track curricula", () => {
  it("defines a track for every profession", () => {
    expect(Object.keys(TRACKS).sort()).toEqual([...PROFESSION_SLUGS].sort());
  });

  it("each track carries its own profession slug", () => {
    for (const slug of PROFESSION_SLUGS) {
      expect(TRACKS[slug].profession).toBe(slug);
    }
  });

  it("v1 ships exactly 5 units per track", () => {
    for (const slug of PROFESSION_SLUGS) {
      expect(TRACKS[slug].units).toHaveLength(5);
    }
  });

  it("unit slugs are globally unique (they become unit:<slug> tags)", () => {
    const slugs = allUnits().map(({ unit }) => unit.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every unit has all four locales, a valid level, a topic, and a positive target", () => {
    for (const { profession, unit } of allUnits()) {
      const where = `${profession}/${unit.slug}`;
      for (const locale of LOCALES) {
        expect(unit.title[locale], `${where} title.${locale}`).toBeTruthy();
      }
      expect(CEFR_LEVELS, `${where} level`).toContain(unit.level);
      expect(unit.topic.trim().length, `${where} topic`).toBeGreaterThan(10);
      expect(unit.targetCount, `${where} targetCount`).toBeGreaterThanOrEqual(1);
    }
  });

  it("unit slugs are url/tag-safe (lowercase ascii)", () => {
    for (const { unit } of allUnits()) {
      expect(unit.slug).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it("allUnits flattens every track in order", () => {
    expect(allUnits()).toHaveLength(4 * 5);
  });
});
