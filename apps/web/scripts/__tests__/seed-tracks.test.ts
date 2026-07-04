import { describe, it, expect } from "vitest";

import { TYPE_MIX, parseSeedArgs } from "../seed-tracks";
import { allUnits } from "../../src/content/tracks";

describe("gen:seed-tracks — TYPE_MIX", () => {
  it("generates more exercises per unit than any unit's targetCount", () => {
    const perUnit = TYPE_MIX.reduce((sum, m) => sum + m.count, 0);
    for (const { unit } of allUnits()) {
      expect(perUnit).toBeGreaterThan(unit.targetCount);
    }
  });

  it("mixes vocabulary, scenario, and production types", () => {
    const types = TYPE_MIX.map((m) => m.type);
    expect(types).toContain("FILL_IN_THE_BLANK"); // vocabulary
    expect(types).toContain("READING_COMPREHENSION"); // scenario
    expect(types).toContain("FREE_WRITING"); // production
    expect(new Set(types).size).toBe(types.length);
  });
});

describe("gen:seed-tracks — parseSeedArgs", () => {
  it("defaults to the full seed", () => {
    expect(parseSeedArgs([])).toEqual({
      profession: undefined,
      unit: undefined,
      dryRun: false,
      delayMs: 500,
    });
  });

  it("accepts a profession filter", () => {
    expect(parseSeedArgs(["--profession", "pflege"]).profession).toBe("pflege");
  });

  it("rejects an unknown profession", () => {
    expect(() => parseSeedArgs(["--profession", "astronaut"])).toThrow(
      /Unknown --profession/,
    );
  });

  it("accepts a known unit slug and rejects unknown ones", () => {
    expect(parseSeedArgs(["--unit", "uebergabe"]).unit).toBe("uebergabe");
    expect(() => parseSeedArgs(["--unit", "nope"])).toThrow(/Unknown --unit/);
  });

  it("parses --dry-run and --delay-ms", () => {
    const args = parseSeedArgs(["--dry-run", "--delay-ms", "0"]);
    expect(args.dryRun).toBe(true);
    expect(args.delayMs).toBe(0);
  });

  it("rejects unknown flags", () => {
    expect(() => parseSeedArgs(["--frobnicate"])).toThrow(/Unknown argument/);
  });
});
