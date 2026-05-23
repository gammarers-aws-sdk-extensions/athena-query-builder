/**
 * A SELECT list entry: a bare identifier or a column with an optional alias.
 *
 * @example
 * ```ts
 * 'example_id'
 * { column: 'example_value', as: 'v' }
 * ```
 */
export type SelectColumn = string | { column: string; as?: string };

/**
 * Sort direction for ORDER BY clauses.
 */
export type OrderDirection = 'asc' | 'desc';

/**
 * A single ORDER BY column and direction pair.
 */
export type OrderByEntry = {
  /** Column name (validated as an unquoted identifier). */
  readonly column: string;
  /** Sort direction (`asc` or `desc`). */
  readonly direction: OrderDirection;
};

/**
 * Scalar value accepted in WHERE equality and IN clauses.
 */
export type WhereScalar = string | number | boolean | null;
