/** Soft palette shared by the standings views (same colors as the original sheet). */
export const OBBLIGO_PALETTE = { green: '#d9f2e1', pink: '#fbd9e6' };

/** Standings row background: green = obligation respected, pink = unfavourable. */
export function obbligoRowBg(obbligo: number, pos: number): string {
  if (obbligo === 1) return pos <= 2 ? OBBLIGO_PALETTE.green : OBBLIGO_PALETTE.pink; // must pass
  if (obbligo === -1) return pos <= 2 ? OBBLIGO_PALETTE.pink : OBBLIGO_PALETTE.green; // must not pass
  return '';
}
