# Performance — Sprint 03.5 hotfix

After the Sprint 03 monorepo split, dev-mode page loads regressed from
sub-second to 3–10 s. This file tracks the baseline, the fixes
applied, and the resulting numbers. The methodology is small and
repeatable: nuke `apps/web/.next/`, start `pnpm --filter
@wortschatz/web dev`, and cold-curl the same three URLs in order.

## Methodology

```bash
rm -rf apps/web/.next
pnpm --filter @wortschatz/web dev   # background, capture log
# wait for "Ready in"
curl -s -o /dev/null -w "%{time_total}\n" http://localhost:3000/pt
curl -s -o /dev/null -w "%{time_total}\n" http://localhost:3000/pt/dashboard
curl -s -o /dev/null -w "%{time_total}\n" http://localhost:3000/pt/exercises/FILL_IN_THE_BLANK
# touch a leaf component, re-curl the same /pt for hot-reload timing
```

All numbers below are the **Next.js-reported compile/serve times** in
the dev log (closest to what the user perceives — curl wall time
includes the redirect chase on 307s). Module counts are also from the
dev log.

Environment: WSL2 on ext4 (`/home/jonathan/wortschatz`), Node 22,
pnpm 9.15.9, Next 15.0.3.

## Baseline (before fixes)

Server ready: **1324 ms**

| Route                                  | Compile | Serve   | Modules |
| -------------------------------------- | ------- | ------- | ------- |
| `/pt` (cold)                           | 5.5 s   | 6563 ms | 2162    |
| `/pt/dashboard` (cold, 307)            | 9.2 s   | 10112 ms| 3167    |
| `/pt/exercises/FILL_IN_THE_BLANK` (cold, 307) | 2.5 s | 3436 ms | 3943    |
| Hot reload after touching `MuenzenBadge.tsx`  | 538 ms | 263 ms | 3957    |

Notes:
- `dashboard` and `exercises/[slug]` 307 to the sign-in page (no
  session in the curl request); the compile cost is still real.
- Module counts climb because each new route pulls more of the shared
  graph (MUI, emotion, recharts, the i18n bundle).
- Webpack already logged a `Serializing big strings (128kiB) impacts
  deserialization performance` warning on the dashboard compile —
  a hint that the cache layer is doing more work than it should.

## After fixes

_(to be filled in as Phase 2 lands)_
