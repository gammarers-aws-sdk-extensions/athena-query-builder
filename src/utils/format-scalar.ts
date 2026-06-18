import { QuoteString } from './quote-string';
import type { WhereScalar } from '../types';

/**
 * Renders a scalar value as a SQL literal for use in WHERE, INSERT, UPDATE, and SET clauses.
 */
export class FormatScalar {
  /** Delegates string formatting to {@link QuoteString}. */
  private readonly quoteString = new QuoteString();

  /**
   * Converts a scalar to its SQL representation.
   *
   * - `null` → `NULL`
   * - `boolean` → `TRUE` / `FALSE`
   * - `number` → decimal literal
   * - `string` → single-quoted literal via {@link QuoteString}
   *
   * @param value - Scalar to format.
   * @returns SQL literal text.
   * @throws {Error} When {@link value} is a non-finite number.
   */
  public execute(value: WhereScalar): string {
    if (value === null) {
      return 'NULL';
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid numeric literal: ${value}`);
      }
      return String(value);
    }
    return this.quoteString.execute(value);
  }
}
