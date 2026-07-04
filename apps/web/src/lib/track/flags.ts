/**
 * Feature flag — Sprint 05 ("Beruf"). The career-track experience:
 * profession-driven setup flow, the "Dein Weg" track page, and the
 * dashboard track card. Flip to `false` to hide the entire professional
 * surface — profession stays a dormant profile column and the app
 * behaves exactly as before the pivot.
 */
export const CAREER_TRACKS: boolean = true;

/**
 * Cookie marking that this browser has already seen the setup flow
 * (completed OR skipped). Keeps the dashboard→/setup redirect from
 * looping for users who chose "just learning for myself" (profession
 * stays NULL by design, so the DB can't carry that signal).
 */
export const SETUP_SEEN_COOKIE = "wortschatz:setup-seen";
