import { assertIdentifier, formatScalar } from './instances';
import { pushWhere } from './push-where';
import { requiredCall } from './required-call';
import { AthenaQueryBuilderValidateError } from '../../core/errors';
import type { UpdateAssignments, WhereScalar } from '../../types';

/**
 * Immutable internal state for an `UPDATE` statement.
 */
export interface UpdateBuilderState {
  readonly table?: string;
  readonly assignments?: UpdateAssignments;
  readonly whereClauses: readonly string[];
}

/** Default empty `UPDATE` builder state. */
export const EMPTY_UPDATE_STATE: UpdateBuilderState = {
  whereClauses: [],
};

/**
 * Renders one `column = literal` SET fragment.
 *
 * @param column - Column name.
 * @param value - Scalar assigned to the column (`null` → `NULL`).
 * @returns SQL assignment fragment such as `example_value = 'hello'`.
 * @throws {AthenaQueryBuilderValidateError} When {@link column} is not a valid identifier.
 */
const formatAssignment = (column: string, value: WhereScalar): string => {
  const col = assertIdentifier.execute(column);
  return `${col} = ${formatScalar.execute(value)}`;
};

/**
 * Builds an `UPDATE` statement from {@link state}.
 *
 * @param state - UPDATE builder state.
 * @returns Complete UPDATE statement.
 * @throws {AthenaQueryBuilderValidateError} When `update()` or `set()` has not been called, or when a
 *   column name is not a valid identifier.
 */
export const renderUpdateSql = (state: UpdateBuilderState): string => {
  if (state.table === undefined) {
    throw new AthenaQueryBuilderValidateError(requiredCall('update'));
  }

  const assignments = state.assignments;
  if (assignments === undefined) {
    throw new AthenaQueryBuilderValidateError(requiredCall('set'));
  }

  const columns = Object.keys(assignments);
  if (columns.length === 0) {
    throw new AthenaQueryBuilderValidateError('set() requires at least one column assignment');
  }

  const setList = columns
    .map((col) => formatAssignment(col, assignments[col]))
    .join(', ');

  const parts: string[] = [
    `UPDATE ${state.table}`,
    `SET ${setList}`,
  ];

  pushWhere(parts, state.whereClauses);

  return parts.join('\n');
};
