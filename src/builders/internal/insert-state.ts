import { assertIdentifier, formatScalar } from './instances';
import { requiredCall } from './required-call';
import { AthenaQueryBuilderValidateError } from '../../core/errors';
import type { InsertRow } from '../../types';

/**
 * Immutable internal state for an `INSERT` statement.
 */
export interface InsertBuilderState {
  readonly table?: string;
  readonly rows: readonly InsertRow[];
}

/** Default empty `INSERT` builder state. */
export const EMPTY_INSERT_STATE: InsertBuilderState = {
  rows: [],
};

/**
 * Column names from the first row (insertion order).
 *
 * @param rows - Non-empty list of rows to insert.
 * @returns Ordered column names for the INSERT column list.
 * @throws {AthenaQueryBuilderValidateError} When {@link rows} is empty.
 */
const resolveColumns = (rows: readonly InsertRow[]): readonly string[] => {
  const firstRow = rows[0];
  if (firstRow === undefined) {
    throw new AthenaQueryBuilderValidateError(requiredCall('values'));
  }
  return Object.keys(firstRow);
};

/**
 * Renders one parenthesized VALUES tuple for a row.
 *
 * @param row - Row object.
 * @param columns - Column names in insertion order (from first row).
 * @returns SQL fragment such as `('a', 1, NULL)`.
 * @throws {AthenaQueryBuilderValidateError} When {@link row} is missing a column from {@link columns}.
 */
const formatValueTuple = (
  row: InsertRow,
  columns: readonly string[],
): string => {
  const literals = columns.map((col) => {
    if (!(col in row)) {
      throw new AthenaQueryBuilderValidateError(`Missing column "${col}" in insert row`);
    }
    return formatScalar.execute(row[col]);
  });
  return `(${literals.join(', ')})`;
};

/**
 * Builds an `INSERT` statement from {@link state}.
 *
 * @param state - INSERT builder state.
 * @returns Complete INSERT statement.
 * @throws {AthenaQueryBuilderValidateError} When `into()` or `values()` has not been called, when a row
 *   is missing a column, or when a column name is not a valid identifier.
 */
export const renderInsertSql = (state: InsertBuilderState): string => {
  if (state.table === undefined) {
    throw new AthenaQueryBuilderValidateError(requiredCall('into'));
  }
  if (state.rows.length === 0) {
    throw new AthenaQueryBuilderValidateError(requiredCall('values'));
  }

  const columns = resolveColumns(state.rows);
  const columnList = columns
    .map((col) => assertIdentifier.execute(col))
    .join(', ');
  const valueTuples = state.rows
    .map((row) => formatValueTuple(row, columns))
    .join(', ');

  return `INSERT INTO ${state.table} (${columnList})\nVALUES ${valueTuples}`;
};
