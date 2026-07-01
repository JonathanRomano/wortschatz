import { describe, it, expect } from "vitest";

import {
  EMPTY_SESSION,
  isSessionComplete,
  PRACTICE_SESSIONS,
  recordSubmission,
  SESSION_LENGTH,
  sessionProgressPct,
} from "@/lib/exercises/session";

describe("session flags", () => {
  it("ships enabled with a positive session length", () => {
    expect(PRACTICE_SESSIONS).toBe(true);
    expect(SESSION_LENGTH).toBeGreaterThan(0);
    expect(EMPTY_SESSION).toEqual({ completed: 0, passed: 0 });
  });
});

describe("recordSubmission", () => {
  it("increments completed always and passed only on a pass", () => {
    expect(recordSubmission(EMPTY_SESSION, true)).toEqual({
      completed: 1,
      passed: 1,
    });
    expect(recordSubmission(EMPTY_SESSION, false)).toEqual({
      completed: 1,
      passed: 0,
    });
  });

  it("accumulates across submissions", () => {
    let s = EMPTY_SESSION;
    s = recordSubmission(s, true);
    s = recordSubmission(s, false);
    s = recordSubmission(s, true);
    expect(s).toEqual({ completed: 3, passed: 2 });
  });
});

describe("isSessionComplete", () => {
  it("is true once completed reaches the length", () => {
    expect(isSessionComplete({ completed: 4, passed: 0 }, 5)).toBe(false);
    expect(isSessionComplete({ completed: 5, passed: 0 }, 5)).toBe(true);
    expect(isSessionComplete({ completed: 6, passed: 0 }, 5)).toBe(true);
  });

  it("defaults to SESSION_LENGTH", () => {
    expect(
      isSessionComplete({ completed: SESSION_LENGTH, passed: 0 }),
    ).toBe(true);
  });
});

describe("sessionProgressPct", () => {
  it("scales completed to a 0–100 percentage", () => {
    expect(sessionProgressPct({ completed: 0, passed: 0 }, 5)).toBe(0);
    expect(sessionProgressPct({ completed: 2, passed: 0 }, 5)).toBe(40);
    expect(sessionProgressPct({ completed: 5, passed: 0 }, 5)).toBe(100);
  });

  it("clamps to 100 and handles a non-positive length", () => {
    expect(sessionProgressPct({ completed: 9, passed: 0 }, 5)).toBe(100);
    expect(sessionProgressPct({ completed: 1, passed: 0 }, 0)).toBe(100);
  });
});
