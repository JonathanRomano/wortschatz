/**
 * Feature flag — Overnight loop iter 11. Turn the endless single-type "Next"
 * stream into a bounded practice session: a fixed number of exercises with a
 * progress bar and a celebratory completion screen (Duolingo/Babbel-style
 * bite-size lessons), after which the learner chooses to practice again. Flip
 * to `false` to restore the original infinite "Next" loop.
 */
export const PRACTICE_SESSIONS: boolean = true;

/** How many exercises make up one practice session. */
export const SESSION_LENGTH = 5;

/** Running tally for the current session. Pure data, no UI. */
export type SessionState = {
  /** Exercises submitted so far this session. */
  completed: number;
  /** Of those, how many passed (score ≥ 60). */
  passed: number;
};

export const EMPTY_SESSION: SessionState = { completed: 0, passed: 0 };

/** Fold a submission outcome into the session tally. */
export function recordSubmission(
  state: SessionState,
  passed: boolean,
): SessionState {
  return {
    completed: state.completed + 1,
    passed: state.passed + (passed ? 1 : 0),
  };
}

/** Whether the session has reached its length (only meaningful when enabled). */
export function isSessionComplete(
  state: SessionState,
  length: number = SESSION_LENGTH,
): boolean {
  return state.completed >= length;
}

/** Progress toward the session length, clamped to 0–100 for a progress bar. */
export function sessionProgressPct(
  state: SessionState,
  length: number = SESSION_LENGTH,
): number {
  if (length <= 0) return 100;
  return Math.min(100, Math.round((state.completed / length) * 100));
}
