import type { WhereScalar } from './scalar';

/**
 * Column assignments for `UPDATE ... SET`: column name mapped to a scalar literal.
 *
 * Column order follows `Object.keys` insertion order of the object passed to
 * {@link AthenaQueryBuilder.set}.
 *
 * @example
 * ```ts
 * { example_value: 'hello', example_count: 1, deleted_at: null }
 * ```
 */
export type UpdateAssignments = Record<string, WhereScalar>;
