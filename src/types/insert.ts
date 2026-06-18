import type { WhereScalar } from './scalar';

/**
 * One row for `INSERT ... VALUES`: column name mapped to a scalar literal.
 *
 * Column order follows `Object.keys` insertion order of the first row passed to
 * {@link AthenaInsertBuilder.values}.
 *
 * @example
 * ```ts
 * { example_id: 'ex-1', example_value: 'hello', deleted_at: null }
 * ```
 */
export type InsertRow = Record<string, WhereScalar>;
