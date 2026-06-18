import type {
  InsertRow,
  OrderByEntry,
  OrderDirection,
  SelectColumn,
  WhereScalar,
} from '../types';
import { formatWhereEq, formatWhereIn } from './internal/format-where';
import {
  EMPTY_INSERT_STATE,
  type InsertBuilderState,
  renderInsertSql,
} from './internal/insert-state';
import { assertIdentifier } from './internal/instances';
import {
  EMPTY_SELECT_STATE,
  type SelectBuilderState,
  renderSelectSql,
} from './internal/select-state';

/** Statement kinds supported by {@link AthenaQueryBuilder}. */
type StatementKind = 'select' | 'insert';

/**
 * Immutable internal state for {@link AthenaQueryBuilder}.
 */
interface BuilderState {
  readonly kind?: StatementKind;
  readonly select: SelectBuilderState;
  readonly insert: InsertBuilderState;
}

/** Default empty builder state. */
const EMPTY_STATE: BuilderState = {
  select: EMPTY_SELECT_STATE,
  insert: EMPTY_INSERT_STATE,
};

/**
 * Fluent, immutable query builder for single-table Athena SQL statements.
 *
 * Supports `SELECT` and `INSERT` via one class. Each chain method returns a new
 * instance; mixing `SELECT` and `INSERT` methods on the same builder throws.
 *
 * @example SELECT
 * ```ts
 * const sql = new AthenaQueryBuilder()
 *   .select(['example_id', 'example_value'])
 *   .from('example_table')
 *   .whereIn('example_key', exampleKeys)
 *   .orderBy('example_id', 'asc')
 *   .limit(1000)
 *   .toSql();
 * ```
 *
 * @example INSERT
 * ```ts
 * const sql = new AthenaQueryBuilder()
 *   .into('example_table')
 *   .values({ example_id: 'ex-1', example_value: 'hello' })
 *   .toSql();
 * ```
 */
export class AthenaQueryBuilder {
  /** Current builder state snapshot. */
  private readonly state: BuilderState;

  /**
   * Creates a new builder, optionally from an internal state snapshot.
   *
   * @param state - Initial state; defaults to empty.
   */
  public constructor(state: BuilderState = EMPTY_STATE) {
    this.state = state;
  }

  /**
   * Returns a new builder with merged state.
   *
   * @param partial - Fields to override in a shallow copy of the current state.
   * @returns A new immutable builder instance.
   */
  private clone(partial: Partial<BuilderState>): AthenaQueryBuilder {
    return new AthenaQueryBuilder({ ...this.state, ...partial });
  }

  /**
   * Ensures the builder is building the expected statement kind.
   *
   * @param expected - Required statement kind for the next chain method.
   * @param method - Method name shown in error messages.
   * @throws {Error} When the builder is already configured for another kind.
   */
  private assertKind(expected: StatementKind, method: string): void {
    if (this.state.kind !== undefined && this.state.kind !== expected) {
      throw new Error(
        `${method}() is not available for ${this.state.kind} statements`,
      );
    }
  }

  /**
   * Sets the SELECT column list.
   *
   * @param columns - Column identifiers or `{ column, as? }` entries.
   * @returns A new builder instance.
   * @throws {Error} When the builder is configured for `INSERT`.
   */
  public select(columns: readonly SelectColumn[]): AthenaQueryBuilder {
    this.assertKind('select', 'select');
    return this.clone({
      kind: 'select',
      select: { ...this.state.select, selectColumns: [...columns] },
    });
  }

  /**
   * Sets the FROM table (single unquoted table name).
   *
   * @param table - Table name validated as an identifier.
   * @returns A new builder instance.
   * @throws {Error} When the builder is configured for `INSERT`, or when
   *   {@link table} is not a valid identifier.
   */
  public from(table: string): AthenaQueryBuilder {
    this.assertKind('select', 'from');
    assertIdentifier.execute(table);
    return this.clone({
      kind: 'select',
      select: { ...this.state.select, fromTable: table },
    });
  }

  /**
   * Appends `column = value` or `column IS NULL`.
   *
   * @param column - Column name.
   * @param value - Scalar compared with `=` or `IS NULL`.
   * @returns A new builder instance.
   * @throws {Error} When the builder is configured for `INSERT`, or when
   *   {@link column} is not a valid identifier.
   */
  public whereEq(column: string, value: WhereScalar): AthenaQueryBuilder {
    this.assertKind('select', 'whereEq');
    return this.clone({
      kind: 'select',
      select: {
        ...this.state.select,
        whereClauses: [
          ...this.state.select.whereClauses,
          formatWhereEq(column, value),
        ],
      },
    });
  }

  /**
   * Appends `column IN (...)`. An empty array produces `1=0`.
   *
   * @param column - Column name.
   * @param values - List of scalars for the IN list.
   * @returns A new builder instance.
   * @throws {Error} When the builder is configured for `INSERT`, or when
   *   {@link column} is not a valid identifier.
   */
  public whereIn(
    column: string,
    values: readonly WhereScalar[],
  ): AthenaQueryBuilder {
    this.assertKind('select', 'whereIn');
    return this.clone({
      kind: 'select',
      select: {
        ...this.state.select,
        whereClauses: [
          ...this.state.select.whereClauses,
          formatWhereIn(column, values),
        ],
      },
    });
  }

  /**
   * Appends one or more ORDER BY entries.
   *
   * @param column - Column name when using the two-argument form.
   * @param direction - Sort direction when using the two-argument form.
   * @returns A new builder instance.
   * @throws {Error} When the builder is configured for `INSERT`.
   */
  public orderBy(column: string, direction: OrderDirection): AthenaQueryBuilder;
  /**
   * Appends multiple ORDER BY entries from an array.
   *
   * @param entries - Column and direction pairs.
   * @returns A new builder instance.
   * @throws {Error} When the builder is configured for `INSERT`.
   */
  public orderBy(entries: readonly OrderByEntry[]): AthenaQueryBuilder;
  /**
   * @param columnOrEntries - Column name or list of sort entries.
   * @param direction - Required when the first argument is a column name.
   * @returns A new builder instance.
   * @throws {Error} When the builder is configured for `INSERT`, when the
   *   two-argument form is used without {@link direction}, or when a column
   *   name is not a valid identifier.
   */
  public orderBy(
    columnOrEntries: string | readonly OrderByEntry[],
    direction?: OrderDirection,
  ): AthenaQueryBuilder {
    this.assertKind('select', 'orderBy');
    if (typeof columnOrEntries === 'string') {
      if (direction === undefined) {
        throw new Error('orderBy requires a direction when given a column name');
      }
      return this.clone({
        kind: 'select',
        select: {
          ...this.state.select,
          orderByClauses: [
            ...this.state.select.orderByClauses,
            {
              column: assertIdentifier.execute(columnOrEntries),
              direction,
            },
          ],
        },
      });
    }
    const entries = columnOrEntries.map((e) => ({
      column: assertIdentifier.execute(e.column),
      direction: e.direction,
    }));
    return this.clone({
      kind: 'select',
      select: {
        ...this.state.select,
        orderByClauses: [...this.state.select.orderByClauses, ...entries],
      },
    });
  }

  /**
   * Sets the LIMIT clause.
   *
   * @param n - Non-negative integer row limit.
   * @returns A new builder instance.
   * @throws {Error} When the builder is configured for `INSERT`, or when
   *   {@link n} is not a non-negative integer.
   */
  public limit(n: number): AthenaQueryBuilder {
    this.assertKind('select', 'limit');
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(`limit must be a non-negative integer, got: ${n}`);
    }
    return this.clone({
      kind: 'select',
      select: { ...this.state.select, limitValue: n },
    });
  }

  /**
   * Sets the target table for INSERT.
   *
   * @param table - Table name validated as an identifier.
   * @returns A new builder instance.
   * @throws {Error} When the builder is configured for `SELECT`, or when
   *   {@link table} is not a valid identifier.
   */
  public into(table: string): AthenaQueryBuilder {
    this.assertKind('insert', 'into');
    assertIdentifier.execute(table);
    return this.clone({
      kind: 'insert',
      insert: { ...this.state.insert, table },
    });
  }

  /**
   * Appends one or more rows to insert.
   *
   * @param row - A single row object.
   * @returns A new builder instance.
   * @throws {Error} When the builder is configured for `SELECT`, or when a row
   *   has no columns.
   */
  public values(row: InsertRow): AthenaQueryBuilder;
  /**
   * Appends multiple rows to insert.
   *
   * @param rows - Row objects that share the same column keys as the first row.
   * @returns A new builder instance.
   * @throws {Error} When the builder is configured for `SELECT`, or when a row
   *   has no columns.
   */
  public values(rows: readonly InsertRow[]): AthenaQueryBuilder;
  /**
   * @param rowOrRows - A single row or an array of rows.
   * @returns A new builder instance.
   * @throws {Error} When the builder is configured for `SELECT`, or when a row
   *   has no columns.
   */
  public values(
    rowOrRows: InsertRow | readonly InsertRow[],
  ): AthenaQueryBuilder {
    this.assertKind('insert', 'values');
    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    for (const row of rows) {
      if (Object.keys(row).length === 0) {
        throw new Error('values() requires at least one column per row');
      }
    }
    return this.clone({
      kind: 'insert',
      insert: {
        ...this.state.insert,
        rows: [...this.state.insert.rows, ...rows],
      },
    });
  }

  /**
   * Builds the final Athena SQL string.
   *
   * @returns Complete `SELECT` or `INSERT` statement.
   * @throws {Error} When required chain methods were not called, when statement
   *   kinds are mixed, or when identifiers are invalid.
   */
  public toSql(): string {
    if (this.state.kind === 'insert') {
      return renderInsertSql(this.state.insert);
    }
    if (this.state.kind === 'select') {
      return renderSelectSql(this.state.select);
    }
    throw new Error(
      'select() or into() is required before toSql()',
    );
  }

  /**
   * Alias for {@link toSql}.
   *
   * @returns Complete SQL statement.
   */
  public build(): string {
    return this.toSql();
  }
}
