/**
 * @packageDocumentation
 * Fluent SQL builder for single-table Athena INSERT statements.
 */
import type { InsertRow } from './types';
import { AssertIdentifier, FormatScalar } from './utils';

/** Internal immutable snapshot of insert builder state. */
interface InsertBuilderState {
  readonly table?: string;
  readonly rows: readonly InsertRow[];
}

/** Default empty insert builder state. */
const EMPTY_INSERT_STATE: InsertBuilderState = {
  rows: [],
};

/** Shared {@link AssertIdentifier} instance for {@link AthenaInsertBuilder}. */
const assertIdentifier = new AssertIdentifier();

/** Shared {@link FormatScalar} instance for {@link AthenaInsertBuilder}. */
const formatScalar = new FormatScalar();

/**
 * Fluent, immutable query builder for single-table Athena INSERT statements.
 *
 * Each chain method returns a new instance; the original builder can be reused for branches.
 *
 * @example
 * ```ts
 * const sql = new AthenaInsertBuilder()
 *   .into('example_table')
 *   .values({ example_id: 'ex-1', example_value: 'hello' })
 *   .toSql();
 * ```
 */
export class AthenaInsertBuilder {
  /**
   * Column names from the first row (insertion order).
   *
   * @param rows - Non-empty list of rows to insert.
   * @returns Ordered column names for the INSERT column list.
   */
  private static resolveColumns(rows: readonly InsertRow[]): readonly string[] {
    const firstRow = rows[0];
    if (firstRow === undefined) {
      throw new Error('values() is required before toSql()');
    }
    return Object.keys(firstRow);
  }

  /**
   * Renders one parenthesized VALUES tuple for a row.
   *
   * @param row - Row object.
   * @param columns - Column names in insertion order (from first row).
   * @returns SQL fragment such as `('a', 1, NULL)`.
   */
  private static formatValueTuple(
    row: InsertRow,
    columns: readonly string[],
  ): string {
    const literals = columns.map((col) => {
      if (!(col in row)) {
        throw new Error(`Missing column "${col}" in insert row`);
      }
      return formatScalar.execute(row[col]);
    });
    return `(${literals.join(', ')})`;
  }

  private readonly state: InsertBuilderState;

  /**
   * Creates a new builder, optionally from an internal state snapshot (used by {@link clone}).
   *
   * @param state - Initial state; defaults to empty.
   */
  public constructor(state: InsertBuilderState = EMPTY_INSERT_STATE) {
    this.state = state;
  }

  /**
   * Returns a new builder with merged state.
   *
   * @param partial - Fields to override in a shallow copy of the current state.
   * @returns A new immutable builder instance.
   */
  private clone(partial: Partial<InsertBuilderState>): AthenaInsertBuilder {
    return new AthenaInsertBuilder({ ...this.state, ...partial });
  }

  /**
   * Sets the target table for INSERT.
   *
   * @param table - Table name validated as an identifier.
   * @returns A new builder instance.
   */
  public into(table: string): AthenaInsertBuilder {
    assertIdentifier.execute(table);
    return this.clone({ table });
  }

  /**
   * Appends one or more rows to insert.
   *
   * @param rowOrRows - A single row object or an array of row objects.
   * @returns A new builder instance.
   * @throws {Error} When a row has no columns.
   */
  public values(row: InsertRow): AthenaInsertBuilder;
  /**
   * @param rows - Multiple row objects with the same column keys.
   * @returns A new builder instance.
   */
  public values(rows: readonly InsertRow[]): AthenaInsertBuilder;
  public values(
    rowOrRows: InsertRow | readonly InsertRow[],
  ): AthenaInsertBuilder {
    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    for (const row of rows) {
      if (Object.keys(row).length === 0) {
        throw new Error('values() requires at least one column per row');
      }
    }
    return this.clone({
      rows: [...this.state.rows, ...rows],
    });
  }

  /**
   * Builds the final Athena SQL string.
   *
   * @returns Complete INSERT statement.
   * @throws {Error} When `into()` or `values()` has not been called.
   */
  public toSql(): string {
    if (this.state.table === undefined) {
      throw new Error('into() is required before toSql()');
    }
    if (this.state.rows.length === 0) {
      throw new Error('values() is required before toSql()');
    }

    const columns = AthenaInsertBuilder.resolveColumns(this.state.rows);
    const columnList = columns
      .map((col) => assertIdentifier.execute(col))
      .join(', ');
    const valueTuples = this.state.rows
      .map((row) => AthenaInsertBuilder.formatValueTuple(row, columns))
      .join(', ');

    return `INSERT INTO ${this.state.table} (${columnList})\nVALUES ${valueTuples}`;
  }

  /**
   * Alias for {@link toSql}.
   *
   * @returns Complete INSERT statement.
   */
  public build(): string {
    return this.toSql();
  }
}
