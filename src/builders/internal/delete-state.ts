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
 * @throws {Error} When `delete()` has not been called.
 */
export const renderDeleteSql = (state: DeleteBuilderState): string => {
  if (state.table === undefined) {
    throw new Error('delete() is required before toSql()');
  }

  const parts: string[] = [`DELETE FROM ${state.table}`];

  if (state.whereClauses.length > 0) {
    parts.push(`WHERE ${state.whereClauses.join(' AND ')}`);
  }

  return parts.join('\n');
};
