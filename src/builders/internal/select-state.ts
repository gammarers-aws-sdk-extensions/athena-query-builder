import { assertIdentifier } from './instances';
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
  readonly whereClauses: readonly string[];
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
 * Renders one SELECT list entry (identifier or `column AS alias`).
 *
 * @param col - Column identifier or aliased column descriptor.
 * @returns SQL fragment for the SELECT list.
 * @throws {Error} When a column or alias name is not a valid identifier.
 */
const formatSelectColumn = (col: SelectColumn): string => {
  if (typeof col === 'string') {
    return assertIdentifier.execute(col);
  }
  const expr = assertIdentifier.execute(col.column);
  if (col.as !== undefined) {
    return `${expr} AS ${assertIdentifier.execute(col.as)}`;
  }
  return expr;
};

/**
 * Builds a `SELECT` statement from {@link state}.
 *
 * @param state - SELECT builder state.
 * @returns Complete SELECT statement.
 * @throws {Error} When `select()` or `from()` has not been called.
 */
export const renderSelectSql = (state: SelectBuilderState): string => {
  const parts: string[] = [];

  if (state.selectColumns.length === 0) {
    throw new Error('select() is required before toSql()');
  }
  const selectList = state.selectColumns
    .map((col) => formatSelectColumn(col))
    .join(', ');
  parts.push(`SELECT ${selectList}`);

  if (state.fromTable === undefined) {
    throw new Error('from() is required before toSql()');
  }
  parts.push(`FROM ${state.fromTable}`);

  if (state.whereClauses.length > 0) {
    parts.push(`WHERE ${state.whereClauses.join(' AND ')}`);
  }

  if (state.orderByClauses.length > 0) {
    const orderList = state.orderByClauses
      .map((e) => `${e.column} ${e.direction.toUpperCase()}`)
      .join(', ');
    parts.push(`ORDER BY ${orderList}`);
  }

  if (state.limitValue !== undefined) {
    parts.push(`LIMIT ${state.limitValue}`);
  }

  return parts.join('\n');
};
