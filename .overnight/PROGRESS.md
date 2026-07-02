# Progress — one line per iteration (10-second morning overview)

## Executive summary (morning read)

Branch `feature/overnight-competitive-loop`, off `main`, 19 commits, linear, nothing pushed.
**18 competitive improvements shipped** (+ the recon), each: researched from a best-in-class app →
mapped to our code → implemented behind a **feature flag** (where behavior-changing) → **typecheck +
test + build green** → most risky/money ones **adversarially reviewed** by a second agent. Web test
count grew 532 → ~600+ across the night. No migrations run; no schema touched. Every commit is
independently `git revert`-able.

**What landed, by theme:**
- *German answer-checking:* umlaut/eszett tolerance (2), WORD_ORDER partial credit (4), reveal correct
  answer (7), per-blank mismatch feedback (19).
- *Gamification economy:* escalating streak milestones (5) + streak-award concurrency fix (6) + streak
  celebration (12) + distinct milestone celebration (18); derived XP levels (15); achievements shelf (16).
- *Adaptive practice / SRS-lite:* don't re-serve passed exercises (3); auto-resurface weak items (13).
- *Session flow:* bounded practice sessions + completion screen (11).
- *Exercise UX:* TTS for listening (8); tap-to-pair matching (14).
- *Progress viz:* relative heatmap buckets (9); longest-streak + goal-met stats (10); week-over-week
  recap (17).

**Flags to toggle during review:** `UMLAUT_TOLERANT_GRADING`, `WORD_ORDER_PARTIAL_CREDIT`,
`REVEAL_CORRECT_ANSWER`, `STREAK_MILESTONE_REWARDS`, `PREFER_UNSEEN_EXERCISES`, `PREFER_WEAK_EXERCISES`,
`PRACTICE_SESSIONS`, `LISTENING_TTS`, `MATCHING_TAP_TO_PAIR`, `XP_LEVELS_ENABLED`.

**Deferred (need a supervised migration or don't fit safe autonomous work):** true SM-2 SRS,
streak-freeze, quests, persisted achievements/error-tags, all-time longest streak, daily-goal reward
idempotency; plus V (raw-SQL group-by), W (level nudge), R (Recharts overlay), O (leaderboard). See
DECISIONS.md wind-down note + QUEUE.md.

**Environment caveats:** lint is non-functional on this repo (no ESLint config/install) so it's not a
gate; clear `apps/web/.next` if a stale route-validator typecheck error appears.

---


| Iter | Time | Status | Improvement | Feature flag | Gates (tc/test/build) |
|-----:|------|--------|-------------|--------------|-----------------------|
| 1 | 22:19 | RESEARCH | Codebase recon + seeded 25-item queue | — | baseline ✓ |
| 2 | 22:30 | IMPLEMENTED | Umlaut/eszett-tolerant grading (+17 tests) | `UMLAUT_TOLERANT_GRADING` | ✓/✓/✓ |
| 3 | 22:36 | IMPLEMENTED | Prefer unseen exercises in Next draw (+7 tests) | `PREFER_UNSEEN_EXERCISES` | ✓/✓/✓ |
| 4 | 00:31 | IMPLEMENTED | WORD_ORDER partial credit via LCS (+4 tests) | `WORD_ORDER_PARTIAL_CREDIT` | ✓/✓/✓ |
| 5 | 00:38 | IMPLEMENTED | Escalating streak milestones + day-level bonus fix (+10 tests) | `STREAK_MILESTONE_REWARDS` | ✓/✓/✓ |
| 6 | 00:52 | IMPLEMENTED | Streak-award concurrency: atomic claim-the-day (+3 tests) | — (bugfix) | ✓/✓/✓ |
| 7 | 01:05 | IMPLEMENTED | Reveal correct answer in result panel (+8 tests, i18n×4) | `REVEAL_CORRECT_ANSWER` | ✓/✓/✓ |
| 8 | 01:13 | IMPLEMENTED | TTS for listening exercises (SpeechSynthesis, +4 tests) | `LISTENING_TTS` | ✓/✓/✓ |
| 9 | 01:18 | IMPLEMENTED | Relative activity-heatmap buckets (+3 tests, i18n×4) | — (visual) | ✓/✓/✓ |
| 10 | 01:24 | IMPLEMENTED | Longest-streak + goal-met-days stat cards (+6 tests, i18n×4) | — (dashboard) | ✓/✓/✓ |
| 11 | 01:30 | IMPLEMENTED | Bounded practice session + completion screen (+7 tests, i18n×4) | `PRACTICE_SESSIONS` | ✓/✓/✓ |
| 12 | 01:36 | IMPLEMENTED | Streak celebration line in result panel (+4 tests, i18n×4) | — (additive UI) | ✓/✓/✓ |
| 13 | 01:42 | IMPLEMENTED | Weak-first selection: auto-resurface mistakes (+5 tests) | `PREFER_WEAK_EXERCISES` | ✓/✓/✓ |
| 14 | 01:50 | IMPLEMENTED | Tap-to-pair matching board (+5 tests, i18n×4) | `MATCHING_TAP_TO_PAIR` | ✓/✓/✓ |
| 15 | 01:57 | IMPLEMENTED | Derived XP level badge from lifetime Münzen (+6 tests, i18n×4) | `XP_LEVELS_ENABLED` | ✓/✓/✓ |
| 16 | 02:03 | IMPLEMENTED | Derived achievements shelf — 6 badges (+5 tests) | — (read-only) | ✓/✓/✓ |
| 17 | 02:08 | IMPLEMENTED | Week-over-week recap line in hero (+2 tests, i18n×4) | — (read-only) | ✓/✓/✓ |
| 18 | 02:14 | IMPLEMENTED | Distinct streak-milestone celebration line (+1 test, i18n×4) | — (additive UI) | ✓/✓/✓ |
| 19 | 02:20 | IMPLEMENTED | Per-blank mismatch feedback (you wrote X → correct Y) (+4 tests, i18n×4) | — (via `REVEAL_CORRECT_ANSWER`) | ✓/✓/✓ |
