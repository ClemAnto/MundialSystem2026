/** Shared outcome colors: CSS variables defined by the theme (app/styles/themes).
 * Used via inline [style.background], so they follow theme switches at runtime. */
export const OUTCOME = {
  pass: 'var(--outcome-pass)', // green: favourable / definitive winner
  fail: 'var(--outcome-fail)', // pink: unfavourable / definitive without winner
  open: 'var(--outcome-open)', // yellow: open without winners
  lost: 'var(--outcome-lost)', // red: slip definitively lost
} as const;

/** Darker variants used to tell odd groups apart from even ones. */
export const OUTCOME_DARKER = {
  pass: 'var(--outcome-pass-strong)',
  fail: 'var(--outcome-fail-strong)',
  open: 'var(--outcome-open-strong)',
  neutral: 'var(--outcome-neutral)',
} as const;

/** Standings row background: green = obligation respected, pink = unfavourable. */
export function obbligoRowBg(obbligo: number, pos: number): string {
  if (obbligo === 1) return pos <= 2 ? OUTCOME.pass : OUTCOME.fail; // must pass
  if (obbligo === -1) return pos <= 2 ? OUTCOME.fail : OUTCOME.pass; // must not pass
  return '';
}
