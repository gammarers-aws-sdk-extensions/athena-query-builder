/** SQL string delimiter. Apostrophes inside literals are escaped by doubling this character. */
const SQL_QUOTE = "'";

/**
 * Formats a JavaScript string as a single-quoted SQL string literal.
 *
 * Embedded apostrophes are escaped by doubling (`'` → `''`).
 */
export class QuoteString {
  /**
   * Wraps {@link value} in single quotes and escapes embedded apostrophes (`'` → `''`).
   *
   * @param value - Raw string value to quote.
   * @returns SQL string literal (e.g. `'hello'`).
   */
  public execute(value: string): string {
    const escaped = value.split(SQL_QUOTE).join(SQL_QUOTE + SQL_QUOTE);
    return `${SQL_QUOTE}${escaped}${SQL_QUOTE}`;
  }
}
