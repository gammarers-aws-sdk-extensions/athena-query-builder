import { pushWhere } from './push-where';
import { requiredCall } from './required-call';
import { AthenaQueryBuilderValidateError } from '../../core/errors';

/**
 * Immutable internal state for a `DELETE` statement.
 */
export interface DeleteBuilderState {
  readonly table?: string;
  readonly whereClauses: readonly string[];
}

/** Default empty `DELETE` builder state. */
export const EMPTY_DELETE_STATE: DeleteBuilderState = {
  whereClauses: [],
};

/**
 * Builds a `DELETE` statement from {@link state}.
 *
 * @param state - DELETE builder state.
 * @returns Complete DELETE statement.
 * @throws {AthenaQueryBuilderValidateError} When `delete()` has not been called.
 */
export const renderDeleteSql = (state: DeleteBuilderState): string => {
  if (state.table === undefined) {
    throw new AthenaQueryBuilderValidateError(requiredCall('delete'));
  }

  const parts: string[] = [`DELETE FROM ${state.table}`];

  pushWhere(parts, state.whereClauses);

  return parts.join('\n');
};
