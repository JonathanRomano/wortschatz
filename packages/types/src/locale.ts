/**
 * Localized text shape used across exercises, AI responses, and intros.
 *
 * Keys are intentionally typed as `string` here so this package stays
 * decoupled from any specific locale set. The narrow Locale union
 * (`'en' | 'pt' | 'tr' | 'uk'`) lives in @wortschatz/config; combine
 * the two with `LocalizedText<Locale>` when you need strictness.
 *
 * Tolerates the legacy plain-string shape that some pre-i18n Exercise
 * rows still carry — readers should normalize via pickLocalized().
 */
export type LocalizedText<K extends string = string> = Partial<
  Record<K, string>
>;
