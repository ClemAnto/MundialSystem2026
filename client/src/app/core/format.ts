/** Formats a number as Italian euro amount, e.g. 1.234,56 €. */
export function euro(x: number): string {
  return x.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
