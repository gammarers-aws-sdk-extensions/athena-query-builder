import { AthenaQueryBuilderValidateError } from './errors';
import { QuoteString } from './quote-string';
import type { WhereScalar } from '../types';

/** SQL literal for a null scalar. */
const SQL_NULL = 'NULL';

/** SQL literal for boolean true. */
const SQL_TRUE = 'TRUE';

/** SQL literal for boolean false. */
const SQL_FALSE = 'FALSE';

/**
 * Rejects `NaN` and infinities, which are not SQL numeric literals.
 *
 * @param value - Finite or non-finite number.
 * @returns Decimal literal text.
 * @throws {AthenaQueryBuilderValidateError} When {@link value} is not finite.
 */
const formatFiniteNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    throw new AthenaQueryBuilderValidateError(`Invalid numeric literal: ${value}`);
  }
  return String(value);
};

/**
 * Renders a scalar value as a SQL literal for use in WHERE, INSERT, UPDATE, DELETE, and SET clauses.
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
   * @throws {AthenaQueryBuilderValidateError} When {@link value} is a non-finite number.
   */
  public execute(value: WhereScalar): string {
    if (value === null) {
      return SQL_NULL;
    }
    if (typeof value === 'boolean') {
      return value ? SQL_TRUE : SQL_FALSE;
    }
    if (typeof value === 'number') {
      return formatFiniteNumber(value);
    }
    return this.quoteString.execute(value);
  }
}
