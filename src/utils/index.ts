/**
 * SQL literal and identifier formatting utilities used by query builders.
 *
 * Implementations live in `core`. This module is the public entry for those utilities.
 *
 * @module utils
 * @see {@link QuoteString}
 * @see {@link AssertIdentifier}
 * @see {@link FormatScalar}
 */
export { AssertIdentifier } from '../core/assert-identifier';
export { FormatScalar } from '../core/format-scalar';
export { QuoteString } from '../core/quote-string';
