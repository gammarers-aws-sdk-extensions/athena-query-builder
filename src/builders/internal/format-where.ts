/**
 * WHERE-clause SQL fragment formatters shared by SELECT, UPDATE, and DELETE builders.
 *
 * @module builders/internal
 */
import { assertIdentifier, formatScalar } from './instances';
import type { WhereScalar } from '../../types';

/**
 * Renders `column = value` or `column IS NULL`.
 *
 * @param column - Column name.
 * @param value - Scalar compared with `=` or `IS NULL`.
 * @returns SQL predicate fragment.
 * @throws {Error} When {@link column} is not a valid identifier.
 */
export const formatWhereEq = (column: string, value: WhereScalar): string => {
  const col = assertIdentifier.execute(column);
  if (value === null) {
    return `${col} IS NULL`;
  }
  return `${col} = ${formatScalar.execute(value)}`;
};

/**
 * Renders `column IN (...)`; empty arrays become `1=0`.
 *
 * @param column - Column name.
 * @param values - Values for the IN list.
 * @returns SQL `IN` predicate or `1=0` when {@link values} is empty.
 * @throws {Error} When {@link column} is not a valid identifier.
 */
export const formatWhereIn = (
  column: string,
  values: readonly WhereScalar[],
): string => {
  const col = assertIdentifier.execute(column);
  if (values.length === 0) {
    return '1=0';
  }
  const literals = values
    .map((v) => formatScalar.execute(v))
    .join(', ');
  return `${col} IN (${literals})`;
};
