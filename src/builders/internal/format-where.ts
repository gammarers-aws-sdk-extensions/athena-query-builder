/**
 * WHERE-clause SQL fragment formatters shared by SELECT, UPDATE, and DELETE builders.
 *
 * @module builders/internal
 */
import { assertIdentifier, formatScalar } from './instances';
import { AthenaQueryBuilderValidateError } from '../../core/errors';
import type { WhereScalar } from '../../types';

/** Operators that have no SQL rewrite when the compared value is null. */
type InequalityOp = '<' | '>' | '<=' | '>=';

/** Builder methods that render {@link InequalityOp}. */
type CompareMethod = 'whereLt' | 'whereGt' | 'whereLte' | 'whereGte';

/** SQL for an empty `IN` list. `IN ()` is invalid, and the empty set matches nothing. */
const EMPTY_IN_SQL = '1=0';

/** SQL for an empty `NOT IN` list. `NOT IN ()` is invalid, and excluding nothing matches every row. */
const EMPTY_NOT_IN_SQL = '1=1';

const NULL_COMPARE_HINT =
  'does not accept null; use whereEq() or whereNe() for null checks';

/**
 * Renders `column = value` or `column IS NULL`.
 *
 * @param column - Column name.
 * @param value - Scalar compared with `=` or `IS NULL`.
 * @returns SQL predicate fragment.
 * @throws {AthenaQueryBuilderValidateError} When {@link column} is not a valid identifier.
 */
export const formatWhereEq = (column: string, value: WhereScalar): string => {
  const col = assertIdentifier.execute(column);
  if (value === null) {
    return `${col} IS NULL`;
  }
  return `${col} = ${formatScalar.execute(value)}`;
};

/**
 * Renders `column <> value` or `column IS NOT NULL`.
 *
 * `null` is rewritten to `IS NOT NULL` because `<> NULL` is never true in SQL.
 *
 * @param column - Column name.
 * @param value - Scalar compared with `<>`, or `null` for `IS NOT NULL`.
 * @returns SQL predicate fragment.
 * @throws {AthenaQueryBuilderValidateError} When {@link column} is not a valid identifier.
 */
export const formatWhereNe = (column: string, value: WhereScalar): string => {
  const col = assertIdentifier.execute(column);
  if (value === null) {
    return `${col} IS NOT NULL`;
  }
  return `${col} <> ${formatScalar.execute(value)}`;
};

/**
 * Renders `column < value`, `>`, `<=`, or `>=`.
 *
 * @param column - Column name.
 * @param op - Comparison operator.
 * @param value - Non-null scalar.
 * @param method - Builder method name used in the error when {@link value} is null.
 * @returns SQL predicate fragment.
 * @throws {AthenaQueryBuilderValidateError} When {@link column} is not a valid
 *   identifier, or when {@link value} is null.
 */
export const formatWhereCompare = (
  column: string,
  op: InequalityOp,
  value: WhereScalar,
  method: CompareMethod,
): string => {
  const col = assertIdentifier.execute(column);

  // `column < NULL` is never true in SQL. Callers use whereEq / whereNe for null.
  if (value === null) {
    throw new AthenaQueryBuilderValidateError(`${method}() ${NULL_COMPARE_HINT}`);
  }
  return `${col} ${op} ${formatScalar.execute(value)}`;
};

/**
 * Renders `column BETWEEN low AND high`. Bounds are not reordered.
 *
 * @param column - Column name.
 * @param low - Inclusive lower bound.
 * @param high - Inclusive upper bound.
 * @returns SQL `BETWEEN` predicate.
 * @throws {AthenaQueryBuilderValidateError} When {@link column} is not a valid
 *   identifier, or when either bound is null.
 */
export const formatWhereBetween = (
  column: string,
  low: WhereScalar,
  high: WhereScalar,
): string => {
  const col = assertIdentifier.execute(column);

  // Bounds stay in caller order. Null has no BETWEEN rewrite.
  if (low === null || high === null) {
    throw new AthenaQueryBuilderValidateError(`whereBetween() ${NULL_COMPARE_HINT}`);
  }
  return `${col} BETWEEN ${formatScalar.execute(low)} AND ${formatScalar.execute(high)}`;
};

/**
 * Renders `column LIKE pattern`. `%` and `_` stay as wildcards.
 *
 * @param column - Column name.
 * @param pattern - LIKE pattern. Quotes are escaped; wildcards are not.
 *   Typed as `unknown` so a non-string from JavaScript is rejected here.
 * @returns SQL `LIKE` predicate.
 * @throws {AthenaQueryBuilderValidateError} When {@link column} is not a valid
 *   identifier, or when {@link pattern} is not a string.
 */
export const formatWhereLike = (column: string, pattern: unknown): string => {
  const col = assertIdentifier.execute(column);
  if (typeof pattern !== 'string') {
    throw new AthenaQueryBuilderValidateError(
      'whereLike() requires a string pattern',
    );
  }
  return `${col} LIKE ${formatScalar.execute(pattern)}`;
};

/**
 * Renders `column IN (...)`; empty arrays become `1=0`.
 *
 * @param column - Column name.
 * @param values - Values for the IN list.
 * @returns SQL `IN` predicate or `1=0` when {@link values} is empty.
 * @throws {AthenaQueryBuilderValidateError} When {@link column} is not a valid identifier.
 */
export const formatWhereIn = (
  column: string,
  values: readonly WhereScalar[],
): string => formatInList(column, values, 'IN', EMPTY_IN_SQL);

/**
 * Renders `column NOT IN (...)`; empty arrays become `1=1`.
 *
 * An empty exclusion list matches every row, so it is `1=1` rather than invalid `NOT IN ()`.
 *
 * @param column - Column name.
 * @param values - Values excluded by the NOT IN list.
 * @returns SQL `NOT IN` predicate or `1=1` when {@link values} is empty.
 * @throws {AthenaQueryBuilderValidateError} When {@link column} is not a valid identifier.
 */
export const formatWhereNotIn = (
  column: string,
  values: readonly WhereScalar[],
): string => formatInList(column, values, 'NOT IN', EMPTY_NOT_IN_SQL);

const formatInList = (
  column: string,
  values: readonly WhereScalar[],
  keyword: 'IN' | 'NOT IN',
  emptySql: typeof EMPTY_IN_SQL | typeof EMPTY_NOT_IN_SQL,
): string => {
  const col = assertIdentifier.execute(column);
  if (values.length === 0) {
    return emptySql;
  }
  const literals = values.map((v) => formatScalar.execute(v)).join(', ');
  return `${col} ${keyword} (${literals})`;
};
