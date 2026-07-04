import { vi, describe, it, expect, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUniqueOrThrow: vi.fn(),
  exerciseFindMany: vi.fn(),
  attemptFindMany: vi.fn(),
}));

vi.mock("@wortschatz/database", () => ({
  prisma: {
    user: { findUniqueOrThrow: mocks.userFindUniqueOrThrow },
    exercise: { findMany: mocks.exerciseFindMany },
    userExercise: { findMany: mocks.attemptFindMany },
  },
}));

import { fetchTrackData } from "@/lib/track/queries";

const NOW = new Date("2026-07-04T15:00:00Z");

beforeEach(() => {
  mocks.userFindUniqueOrThrow.mockReset();
  mocks.exerciseFindMany.mockReset().mockResolvedValue([]);
  mocks.attemptFindMany.mockReset().mockResolvedValue([]);
});

describe("fetchTrackData", () => {
  it("returns a trackless payload when the user has no profession", async () => {
    mocks.userFindUniqueOrThrow.mockResolvedValue({
      profession: null,
      targetLevel: "B2",
      dailyGoal: 7,
    });

    const data = await fetchTrackData("u1", NOW);

    expect(data.progress).toBeNull();
    expect(data.plan).toEqual([]);
    expect(data.targetLevel).toBe("B2");
    expect(data.dailyGoal).toBe(7);
    expect(mocks.exerciseFindMany).not.toHaveBeenCalled();
  });

  it("returns a trackless payload for a stale/unknown profession slug", async () => {
    mocks.userFindUniqueOrThrow.mockResolvedValue({
      profession: "astronaut",
      targetLevel: null,
      dailyGoal: 5,
    });

    const data = await fetchTrackData("u1", NOW);
    expect(data.progress).toBeNull();
  });

  it("groups exercises by unit tag and applies the pass/today rules", async () => {
    mocks.userFindUniqueOrThrow.mockResolvedValue({
      profession: "pflege",
      targetLevel: "B2",
      dailyGoal: 3,
    });
    mocks.exerciseFindMany.mockResolvedValue([
      { id: "e1", type: "MATCHING", title: "Eins", tags: ["beruf:pflege", "unit:stationsalltag"] },
      { id: "e2", type: "MATCHING", title: "Zwei", tags: ["beruf:pflege", "unit:stationsalltag"] },
      // No unit tag → not part of any unit; ignored by the track.
      { id: "e3", type: "MATCHING", title: "Drei", tags: ["beruf:pflege"] },
    ]);
    mocks.attemptFindMany.mockResolvedValue([
      // Passed today.
      { exerciseId: "e1", score: 80, completedAt: new Date("2026-07-04T09:00:00Z") },
      // Failed attempt → weak, not passed.
      { exerciseId: "e2", score: 40, completedAt: new Date("2026-07-03T09:00:00Z") },
    ]);

    const data = await fetchTrackData("u1", NOW);

    expect(data.progress).not.toBeNull();
    const first = data.progress!.units[0]!;
    expect(first.unit.slug).toBe("stationsalltag");
    expect(first.total).toBe(2);
    expect(first.passed).toBe(1);

    // Plan: e1 checked off (passed today), then e2 (weak) next.
    expect(data.plan.map((p) => p.exercise.id)).toEqual(["e1", "e2"]);
    expect(data.plan.map((p) => p.done)).toEqual([true, false]);
  });

  it("does not count a yesterday pass as done-today", async () => {
    mocks.userFindUniqueOrThrow.mockResolvedValue({
      profession: "pflege",
      targetLevel: null,
      dailyGoal: 2,
    });
    mocks.exerciseFindMany.mockResolvedValue([
      { id: "e1", type: "MATCHING", title: "Eins", tags: ["beruf:pflege", "unit:stationsalltag"] },
      { id: "e2", type: "MATCHING", title: "Zwei", tags: ["beruf:pflege", "unit:stationsalltag"] },
    ]);
    mocks.attemptFindMany.mockResolvedValue([
      { exerciseId: "e1", score: 100, completedAt: new Date("2026-07-03T23:59:00Z") },
    ]);

    const data = await fetchTrackData("u1", NOW);

    // e1 passed (not today) → excluded entirely; plan starts at e2.
    expect(data.plan.map((p) => p.exercise.id)).toEqual(["e2"]);
    expect(data.plan[0]!.done).toBe(false);
  });

  it("scopes both queries to the profession tag", async () => {
    mocks.userFindUniqueOrThrow.mockResolvedValue({
      profession: "gastro",
      targetLevel: null,
      dailyGoal: 5,
    });

    await fetchTrackData("u1", NOW);

    const exWhere = mocks.exerciseFindMany.mock.calls[0]![0].where;
    expect(exWhere.tags).toEqual({ has: "beruf:gastro" });
    const atWhere = mocks.attemptFindMany.mock.calls[0]![0].where;
    expect(atWhere.userId).toBe("u1");
    expect(atWhere.exercise).toEqual({ tags: { has: "beruf:gastro" } });
  });
});
