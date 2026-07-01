# Progress — one line per iteration (10-second morning overview)

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
