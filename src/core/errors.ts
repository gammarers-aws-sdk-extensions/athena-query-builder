/**
 * Errors thrown by this package.
 *
 * Catch {@link AthenaQueryBuilderValidateError} before {@link AthenaQueryBuilderError}.
 *
 * @module core/errors
 */

/**
 * Base type for every error thrown by athena-query-builder.
 */
export abstract class AthenaQueryBuilderError extends Error {
  /** Stable name for `instanceof` checks across compile targets. */
  override readonly name: string = 'AthenaQueryBuilderError';

  /**
   * @param message - Failure description.
   */
  protected constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AthenaQueryBuilderError.prototype);
  }
}

/**
 * Invalid builder input: bad identifiers, missing clauses, or predicates that cannot be rendered.
 */
export class AthenaQueryBuilderValidateError extends AthenaQueryBuilderError {
  /** Stable name for `instanceof` checks across compile targets. */
  override readonly name: string = 'AthenaQueryBuilderValidateError';

  /**
   * @param message - What failed validation.
   */
  public constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AthenaQueryBuilderValidateError.prototype);
  }
}
