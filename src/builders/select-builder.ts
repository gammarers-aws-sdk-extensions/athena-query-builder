import type {
  OrderByEntry,
  OrderDirection,
  SelectColumn,
  WhereScalar,
} from '../types';
import { formatWhereEq, formatWhereIn } from './internal/format-where';
import { assertIdentifier } from './internal/instances';

/**
 * Fluent builder for single-table `SELECT` statements.
 *
 * @module builders/select-builder
 */

/**
 * Immutable internal state for {@link AthenaQueryBuilder}.
 */
interface SelectBuilderState {
  readonly selectColumns: readonly SelectColumn[];
  readonly fromTable?: string;
  readonly whereClauses: readonly string[];
  readonly orderByClauses: readonly OrderByEntry[];
  readonly limitValue?: number;
}

/** Default empty SELECT builder state. */
const EMPTY_SELECT_STATE: SelectBuilderState = {
  selectColumns: [],
  whereClauses: [],
  orderByClauses: [],
};

/**
 * Fluent, immutable query builder for single-table Athena SELECT statements (Phase 1).
 *
 * Each chain method returns a new instance; the original builder can be reused for branches.
 *
 * @example
 * ```ts
 * const sql = new AthenaQueryBuilder()
 *   .select(['example_id', 'example_value'])
 *   .from('example_table')
 *   .whereIn('example_key', exampleKeys)
 *   .orderBy('example_id', 'asc')
 *   .limit(1000)
 *   .toSql();
 * ```
 */
export class AthenaQueryBuilder {
  /**
   * Renders one SELECT list entry (identifier or `column AS alias`).
   *
   * @param col - Column identifier or aliased column descriptor.
   * @returns SQL fragment for the SELECT list.
   * @throws {Error} When a column or alias name is not a valid identifier.
   */
  private static formatSelectColumn(col: SelectColumn): string {
    if (typeof col === 'string') {
      return assertIdentifier.execute(col);
    }
    const expr = assertIdentifier.execute(col.column);
    if (col.as !== undefined) {
      return `${expr} AS ${assertIdentifier.execute(col.as)}`;
    }
    return expr;
  }

  /** Current builder state snapshot. */
  private readonly state: SelectBuilderState;

  /**
   * Creates a new builder, optionally from an internal state snapshot (used by {@link clone}).
   *
   * @param state - Initial state; defaults to empty.
   */
  public constructor(state: SelectBuilderState = EMPTY_SELECT_STATE) {
    this.state = state;
  }

  /**
   * Returns a new builder with merged state.
   *
   * @param partial - Fields to override in a shallow copy of the current state.
   * @returns A new immutable builder instance.
   */
  private clone(partial: Partial<SelectBuilderState>): AthenaQueryBuilder {
    return new AthenaQueryBuilder({ ...this.state, ...partial });
  }

  /**
   * Sets the SELECT column list.
   *
   * @param columns - Column identifiers or `{ column, as? }` entries.
   * @returns A new builder instance.
   */
  public select(columns: readonly SelectColumn[]): AthenaQueryBuilder {
    return this.clone({ selectColumns: [...columns] });
  }

  /**
   * Sets the FROM table (single unquoted table name).
   *
   * @param table - Table name validated as an identifier.
   * @returns A new builder instance.
   * @throws {Error} When {@link table} is not a valid identifier.
   */
  public from(table: string): AthenaQueryBuilder {
    assertIdentifier.execute(table);
    return this.clone({ fromTable: table });
  }

  /**
   * Appends `column = value` or `column IS NULL`.
   *
   * String values are escaped and embedded as literals.
   *
   * @param column - Column name.
   * @param value - Scalar compared with `=` or `IS NULL`.
   * @returns A new builder instance.
   * @throws {Error} When {@link column} is not a valid identifier.
   */
  public whereEq(column: string, value: WhereScalar): AthenaQueryBuilder {
    return this.clone({
      whereClauses: [
        ...this.state.whereClauses,
        formatWhereEq(column, value),
      ],
    });
  }

  /**
   * Appends `column IN (...)`. An empty array produces `1=0`.
   *
   * @param column - Column name.
   * @param values - List of scalars for the IN list.
   * @returns A new builder instance.
   * @throws {Error} When {@link column} is not a valid identifier.
   */
  public whereIn(
    column: string,
    values: readonly WhereScalar[],
  ): AthenaQueryBuilder {
    return this.clone({
      whereClauses: [
        ...this.state.whereClauses,
        formatWhereIn(column, values),
      ],
    });
  }

  /**
   * Appends one or more ORDER BY entries.
   *
   * @param column - Column name when using the two-argument form.
   * @param direction - Sort direction when using the two-argument form.
   * @returns A new builder instance.
   */
  public orderBy(column: string, direction: OrderDirection): AthenaQueryBuilder;
  /**
   * Appends multiple ORDER BY entries from an array.
   *
   * @param entries - Column and direction pairs.
   * @returns A new builder instance.
   */
  public orderBy(entries: readonly OrderByEntry[]): AthenaQueryBuilder;
  /**
   * @param columnOrEntries - Column name or list of sort entries.
   * @param direction - Required when the first argument is a column name.
   * @returns A new builder instance.
   * @returns A new builder instance.
   * @throws {Error} When the two-argument form is used without {@link direction},
   *   or when a column name is not a valid identifier.
   */
  public orderBy(
    columnOrEntries: string | readonly OrderByEntry[],
    direction?: OrderDirection,
  ): AthenaQueryBuilder {
    if (typeof columnOrEntries === 'string') {
      if (direction === undefined) {
        throw new Error('orderBy requires a direction when given a column name');
      }
      return this.clone({
        orderByClauses: [
          ...this.state.orderByClauses,
          {
            column: assertIdentifier.execute(columnOrEntries),
            direction,
          },
        ],
      });
    }
    const entries = columnOrEntries.map((e) => ({
      column: assertIdentifier.execute(e.column),
      direction: e.direction,
    }));
    return this.clone({
      orderByClauses: [...this.state.orderByClauses, ...entries],
    });
  }

  /**
   * Sets the LIMIT clause.
   *
   * @param n - Non-negative integer row limit.
   * @returns A new builder instance.
   * @throws {Error} When {@link n} is not a non-negative integer.
   */
  public limit(n: number): AthenaQueryBuilder {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(`limit must be a non-negative integer, got: ${n}`);
    }
    return this.clone({ limitValue: n });
  }

  /**
   * Builds the final Athena SQL string (newline-separated clauses).
   *
   * @returns Complete SELECT statement.
   * @throws {Error} When `select()` or `from()` has not been called.
   */
  public toSql(): string {
    const parts: string[] = [];

    if (this.state.selectColumns.length === 0) {
      throw new Error('select() is required before toSql()');
    }
    const selectList = this.state.selectColumns
      .map((col) => AthenaQueryBuilder.formatSelectColumn(col))
      .join(', ');
    parts.push(`SELECT ${selectList}`);

    if (this.state.fromTable === undefined) {
      throw new Error('from() is required before toSql()');
    }
    parts.push(`FROM ${this.state.fromTable}`);

    if (this.state.whereClauses.length > 0) {
      parts.push(`WHERE ${this.state.whereClauses.join(' AND ')}`);
    }

    if (this.state.orderByClauses.length > 0) {
      const orderList = this.state.orderByClauses
        .map((e) => `${e.column} ${e.direction.toUpperCase()}`)
        .join(', ');
      parts.push(`ORDER BY ${orderList}`);
    }

    if (this.state.limitValue !== undefined) {
      parts.push(`LIMIT ${this.state.limitValue}`);
    }

    return parts.join('\n');
  }

  /**
   * Alias for {@link toSql}.
   *
   * @returns Complete SELECT statement.
   */
  public build(): string {
    return this.toSql();
  }
}
