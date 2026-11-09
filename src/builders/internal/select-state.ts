import { formatSelectColumn } from './format-select-expr';
import { orderDirectionSql } from './order-direction';
import { pushWhere } from './push-where';
import { requiredCall } from './required-call';
import type { WhereClause } from './where-clause';
import { AthenaQueryBuilderValidateError } from '../../core/errors';
import type {
  OrderByEntry,
  SelectColumn,
} from '../../types';

/**
 * Immutable internal state for a `SELECT` statement.
 */
export interface SelectBuilderState {
  readonly selectColumns: readonly SelectColumn[];
  readonly fromTable?: string;
  readonly whereClauses: readonly WhereClause[];
  readonly orderByClauses: readonly OrderByEntry[];
  readonly limitValue?: number;
}

/** Default empty `SELECT` builder state. */
export const EMPTY_SELECT_STATE: SelectBuilderState = {
  selectColumns: [],
  whereClauses: [],
  orderByClauses: [],
};

/**
 * Builds a `SELECT` statement from {@link state}.
 *
 * @param state - SELECT builder state.
 * @returns Complete SELECT statement.
 * @throws {AthenaQueryBuilderValidateError} When `select()` or `from()` has not been called, or a SELECT entry is invalid.
 */
export const renderSelectSql = (state: SelectBuilderState): string => {
  const parts: string[] = [];

  if (state.selectColumns.length === 0) {
    throw new AthenaQueryBuilderValidateError(requiredCall('select'));
  }
  const selectList = state.selectColumns
    .map((col) => formatSelectColumn(col))
    .join(', ');
  parts.push(`SELECT ${selectList}`);

  if (state.fromTable === undefined) {
    throw new AthenaQueryBuilderValidateError(requiredCall('from'));
  }
  parts.push(`FROM ${state.fromTable}`);

  pushWhere(parts, state.whereClauses);

  if (state.orderByClauses.length > 0) {
    const orderList = state.orderByClauses
      .map((e) => `${e.column} ${orderDirectionSql(e.direction)}`)
      .join(', ');
    parts.push(`ORDER BY ${orderList}`);
  }

  if (state.limitValue !== undefined) {
    parts.push(`LIMIT ${state.limitValue}`);
  }

  return parts.join('\n');
};
