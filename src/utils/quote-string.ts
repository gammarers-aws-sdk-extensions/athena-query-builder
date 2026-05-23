/**
 * Formats a JavaScript string as a single-quoted SQL string literal with escaping.
 */
export class QuoteString {
  /**
   * Wraps {@link value} in single quotes and escapes embedded apostrophes (`'` → `''`).
   *
   * @param value - Raw string value to quote.
   * @returns SQL string literal (e.g. `'hello'`).
   */
  public execute(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
  }
}
