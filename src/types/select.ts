/**
 * A SELECT list entry: a bare identifier or a column with an optional alias.
 *
 * @example
 * ```ts
 * 'example_id'
 * { column: 'example_value', as: 'v' }
 * ```
 */
export type SelectColumn =
  | string
  | {
    /** Source column identifier. */
    column: string;
    /** Optional alias for the SELECT list (`column AS alias`). */
    as?: string;
  };

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
