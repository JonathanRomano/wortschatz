import { describe, it, expect } from "vitest";
import {
  PROFESSION_SLUGS,
  PROFESSION_TAG_PREFIX,
  UNIT_TAG_PREFIX,
  isProfessionSlug,
  professionTag,
  unitTag,
  professionsFromTags,
  unitFromTags,
} from "@wortschatz/config";

describe("professions config", () => {
  it("ships the four launch professions", () => {
    expect(PROFESSION_SLUGS).toEqual(["pflege", "it", "gastro", "handwerk"]);
  });

  describe("isProfessionSlug", () => {
    it("accepts every launch slug", () => {
      for (const slug of PROFESSION_SLUGS) {
        expect(isProfessionSlug(slug)).toBe(true);
      }
    });

    it("rejects unknown strings and non-strings", () => {
      expect(isProfessionSlug("plumber")).toBe(false);
      expect(isProfessionSlug("beruf:pflege")).toBe(false);
      expect(isProfessionSlug("")).toBe(false);
      expect(isProfessionSlug(null)).toBe(false);
      expect(isProfessionSlug(undefined)).toBe(false);
      expect(isProfessionSlug(42)).toBe(false);
    });
  });

  describe("tag builders", () => {
    it("prefixes profession slugs with beruf:", () => {
      expect(professionTag("pflege")).toBe("beruf:pflege");
      expect(professionTag("it")).toBe(`${PROFESSION_TAG_PREFIX}it`);
    });

    it("prefixes unit slugs with unit:", () => {
      expect(unitTag("uebergabe")).toBe("unit:uebergabe");
      expect(unitTag("x")).toBe(`${UNIT_TAG_PREFIX}x`);
    });
  });

  describe("professionsFromTags", () => {
    it("extracts validated slugs from a mixed tags array", () => {
      expect(
        professionsFromTags(["grammar", "beruf:pflege", "unit:uebergabe"]),
      ).toEqual(["pflege"]);
    });

    it("returns multiple professions when tagged with several", () => {
      expect(professionsFromTags(["beruf:it", "beruf:gastro"])).toEqual([
        "it",
        "gastro",
      ]);
    });

    it("ignores unknown beruf: tags (removed professions must not break old rows)", () => {
      expect(professionsFromTags(["beruf:astronaut", "beruf:handwerk"])).toEqual([
        "handwerk",
      ]);
    });

    it("dedupes repeated tags", () => {
      expect(professionsFromTags(["beruf:it", "beruf:it"])).toEqual(["it"]);
    });

    it("returns [] for untagged exercises", () => {
      expect(professionsFromTags([])).toEqual([]);
      expect(professionsFromTags(["dativ", "alltag"])).toEqual([]);
    });
  });

  describe("unitFromTags", () => {
    it("returns the first unit slug", () => {
      expect(unitFromTags(["beruf:pflege", "unit:uebergabe"])).toBe("uebergabe");
      expect(unitFromTags(["unit:a", "unit:b"])).toBe("a");
    });

    it("returns null when no unit tag is present", () => {
      expect(unitFromTags(["beruf:pflege"])).toBeNull();
      expect(unitFromTags([])).toBeNull();
    });
  });
});
