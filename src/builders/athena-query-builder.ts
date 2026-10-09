import { AthenaQueryBuilderValidateError } from '../core/errors';
import type {
  InsertRow,
  OrderByEntry,
  OrderDirection,
  SelectColumn,
  UpdateAssignments,
  WhereScalar,
} from '../types';
import {
  EMPTY_DELETE_STATE,
  type DeleteBuilderState,
  renderDeleteSql,
} from './internal/delete-state';
import {
  formatWhereBetween,
  formatWhereCompare,
  formatWhereEq,
  formatWhereIn,
  formatWhereLike,
  formatWhereNe,
  formatWhereNotIn,
} from './internal/format-where';
import {
  EMPTY_INSERT_STATE,
  type InsertBuilderState,
  renderInsertSql,
} from './internal/insert-state';
import { assertIdentifier } from './internal/instances';
import { assertOrderDirection } from './internal/order-direction';
import {
  EMPTY_SELECT_STATE,
  type SelectBuilderState,
  renderSelectSql,
} from './internal/select-state';
import {
  EMPTY_UPDATE_STATE,
  type UpdateBuilderState,
  renderUpdateSql,
} from './internal/update-state';
import type { WhereClause, WhereJoin } from './internal/where-clause';

/** Statement kinds supported by {@link AthenaQueryBuilder}. */
type StatementKind = 'select' | 'insert' | 'update' | 'delete';

/** WHERE group methods that share the same callback rules. */
type WhereGroupMethod = 'whereGroup' | 'orWhereGroup';

/**
 * Immutable internal state for {@link AthenaQueryBuilder}.
 */
interface BuilderState {
  readonly kind?: StatementKind;
  readonly select: SelectBuilderState;
  readonly insert: InsertBuilderState;
  readonly update: UpdateBuilderState;
  readonly delete: DeleteBuilderState;
}

/** Default empty builder state. */
const EMPTY_STATE: BuilderState = {
  select: EMPTY_SELECT_STATE,
  insert: EMPTY_INSERT_STATE,
  update: EMPTY_UPDATE_STATE,
  delete: EMPTY_DELETE_STATE,
};

/**
 * A group callback may only fill WHERE clauses.
 *
 * WHERE methods on a fresh builder set the kind to `select` and leave the
 * other SELECT fields empty. `select`, `from`, `orderBy`, and `limit` fill
 * those fields. INSERT, UPDATE, and DELETE set another statement kind.
 *
 * @param state - Builder state returned by a WHERE group callback.
 * @returns Whether that state contains only WHERE clauses.
 */
const isWhereOnlyState = (state: BuilderState): boolean => {
  if (state.kind === 'insert' || state.kind === 'update' || state.kind === 'delete') {
    return false;
  }

  const select = state.select;
  if (select.selectColumns.length > 0 || select.fromTable !== undefined) {
    return false;
  }
  if (select.orderByClauses.length > 0 || select.limitValue !== undefined) {
    return false;
  }

  return true;
};

/**
 * Fluent, immutable query builder for single-table Athena SQL statements.
 *
 * Supports `SELECT`, `INSERT`, `UPDATE`, and `DELETE` via one class. Each chain
 * method returns a new instance; mixing methods for different statement kinds
 * on the same builder throws.
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
 *
 * @example UPDATE
 * ```ts
 * const sql = new AthenaQueryBuilder()
 *   .update('example_table')
 *   .set({ example_value: 'hello' })
 *   .whereEq('example_id', 'ex-1')
 *   .toSql();
 * ```
 *
 * @example DELETE
 * ```ts
 * const sql = new AthenaQueryBuilder()
 *   .delete('example_table')
 *   .whereEq('example_id', 'ex-1')
 *   .toSql();
 * ```
 */
export class AthenaQueryBuilder {
  /** Current builder state snapshot. */
  private readonly state: BuilderState;

  /**
   * Creates an empty builder.
   */
  public constructor();
  /**
   * Creates a builder from an internal state snapshot.
   *
   * Published declarations omit this signature, so callers outside this file
   * cannot pass the internal state.
   *
   * @internal
   * @param state - Initial state.
   */
  public constructor(state: BuilderState);
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
   * Ensures the builder is building one of the expected statement kinds.
   *
   * @param expected - Allowed statement kind(s) for the next chain method.
   * @param method - Method name shown in error messages.
   * @throws {AthenaQueryBuilderValidateError} When the builder is already configured for another kind.
   */
  private assertKind(
    expected: StatementKind | readonly StatementKind[],
    method: string,
  ): void {
    if (this.state.kind === undefined) {
      return;
    }
    const allowed = typeof expected === 'string' ? [expected] : expected;
    if (allowed.includes(this.state.kind)) {
      return;
    }
    throw new AthenaQueryBuilderValidateError(
      `${method}() is not available for ${this.state.kind} statements`,
    );
  }

  /**
   * Sets the SELECT column list.
   *
   * @param columns - Column identifiers or `{ column, as? }` entries.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, `UPDATE`, or
   *   `DELETE`.
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
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, `UPDATE`, or
   *   `DELETE`, or when {@link table} is not a valid identifier.
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
   * Available for `SELECT`, `UPDATE`, and `DELETE` statements.
   *
   * @param column - Column name.
   * @param value - Scalar compared with `=` or `IS NULL`.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, or when
   *   {@link column} is not a valid identifier.
   */
  public whereEq(column: string, value: WhereScalar): AthenaQueryBuilder {
    this.assertKind(['select', 'update', 'delete'], 'whereEq');
    return this.appendPredicate(formatWhereEq(column, value));
  }

  /**
   * Appends `column IN (...)`. An empty array produces `1=0`.
   *
   * Available for `SELECT`, `UPDATE`, and `DELETE` statements.
   *
   * @param column - Column name.
   * @param values - List of scalars for the IN list.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, or when
   *   {@link column} is not a valid identifier.
   */
  public whereIn(
    column: string,
    values: readonly WhereScalar[],
  ): AthenaQueryBuilder {
    this.assertKind(['select', 'update', 'delete'], 'whereIn');
    return this.appendPredicate(formatWhereIn(column, values));
  }

  /**
   * Appends `column <> value` or `column IS NOT NULL`.
   *
   * Available for `SELECT`, `UPDATE`, and `DELETE` statements.
   *
   * @param column - Column name.
   * @param value - Scalar compared with `<>`, or `null` for `IS NOT NULL`.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, or when
   *   {@link column} is not a valid identifier.
   */
  public whereNe(column: string, value: WhereScalar): AthenaQueryBuilder {
    this.assertKind(['select', 'update', 'delete'], 'whereNe');
    return this.appendPredicate(formatWhereNe(column, value));
  }

  /**
   * Appends `column < value`.
   *
   * Available for `SELECT`, `UPDATE`, and `DELETE` statements.
   *
   * @param column - Column name.
   * @param value - Non-null scalar.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, when
   *   {@link column} is not a valid identifier, or when {@link value} is null.
   */
  public whereLt(column: string, value: WhereScalar): AthenaQueryBuilder {
    this.assertKind(['select', 'update', 'delete'], 'whereLt');
    return this.appendPredicate(formatWhereCompare(column, '<', value, 'whereLt'));
  }

  /**
   * Appends `column > value`.
   *
   * Available for `SELECT`, `UPDATE`, and `DELETE` statements.
   *
   * @param column - Column name.
   * @param value - Non-null scalar.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, when
   *   {@link column} is not a valid identifier, or when {@link value} is null.
   */
  public whereGt(column: string, value: WhereScalar): AthenaQueryBuilder {
    this.assertKind(['select', 'update', 'delete'], 'whereGt');
    return this.appendPredicate(formatWhereCompare(column, '>', value, 'whereGt'));
  }

  /**
   * Appends `column <= value`.
   *
   * Available for `SELECT`, `UPDATE`, and `DELETE` statements.
   *
   * @param column - Column name.
   * @param value - Non-null scalar.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, when
   *   {@link column} is not a valid identifier, or when {@link value} is null.
   */
  public whereLte(column: string, value: WhereScalar): AthenaQueryBuilder {
    this.assertKind(['select', 'update', 'delete'], 'whereLte');
    return this.appendPredicate(formatWhereCompare(column, '<=', value, 'whereLte'));
  }

  /**
   * Appends `column >= value`.
   *
   * Available for `SELECT`, `UPDATE`, and `DELETE` statements.
   *
   * @param column - Column name.
   * @param value - Non-null scalar.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, when
   *   {@link column} is not a valid identifier, or when {@link value} is null.
   */
  public whereGte(column: string, value: WhereScalar): AthenaQueryBuilder {
    this.assertKind(['select', 'update', 'delete'], 'whereGte');
    return this.appendPredicate(formatWhereCompare(column, '>=', value, 'whereGte'));
  }

  /**
   * Appends `column BETWEEN low AND high`. Bounds are inclusive and not reordered.
   *
   * Available for `SELECT`, `UPDATE`, and `DELETE` statements.
   *
   * @param column - Column name.
   * @param low - Inclusive lower bound.
   * @param high - Inclusive upper bound.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, when
   *   {@link column} is not a valid identifier, or when either bound is null.
   */
  public whereBetween(
    column: string,
    low: WhereScalar,
    high: WhereScalar,
  ): AthenaQueryBuilder {
    this.assertKind(['select', 'update', 'delete'], 'whereBetween');
    return this.appendPredicate(formatWhereBetween(column, low, high));
  }

  /**
   * Appends `column LIKE pattern`. `%` and `_` are left as wildcards.
   *
   * Available for `SELECT`, `UPDATE`, and `DELETE` statements.
   *
   * @param column - Column name.
   * @param pattern - LIKE pattern. Quotes are escaped; wildcards are not.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, when
   *   {@link column} is not a valid identifier, or when {@link pattern} is not
   *   a string.
   */
  public whereLike(column: string, pattern: string): AthenaQueryBuilder {
    this.assertKind(['select', 'update', 'delete'], 'whereLike');
    return this.appendPredicate(formatWhereLike(column, pattern));
  }

  /**
   * Appends `column NOT IN (...)`. An empty array produces `1=1`.
   *
   * Available for `SELECT`, `UPDATE`, and `DELETE` statements.
   *
   * @param column - Column name.
   * @param values - List of scalars excluded by the NOT IN list.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, or when
   *   {@link column} is not a valid identifier.
   */
  public whereNotIn(
    column: string,
    values: readonly WhereScalar[],
  ): AthenaQueryBuilder {
    this.assertKind(['select', 'update', 'delete'], 'whereNotIn');
    return this.appendPredicate(formatWhereNotIn(column, values));
  }

  /**
   * Appends a parenthesized WHERE group joined with `AND`.
   *
   * The callback receives an empty builder. Call WHERE methods on it, including
   * nested {@link whereGroup} and {@link orWhereGroup}, and return that chain.
   * Each call returns a new instance, so returning the original argument drops
   * the conditions. The group is always wrapped in parentheses.
   *
   * At the top level, `AND` binds more tightly than `OR`. Wrap an `OR` in
   * {@link whereGroup} when the whole `OR` must be one side of an `AND`.
   *
   * Available for `SELECT`, `UPDATE`, and `DELETE` statements.
   *
   * @param build - Callback that returns the grouped WHERE chain.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`,
   *   when {@link build} does not return a builder, when the callback calls a
   *   non-WHERE method, or when the group has no conditions.
   */
  public whereGroup(
    build: (query: AthenaQueryBuilder) => AthenaQueryBuilder,
  ): AthenaQueryBuilder {
    this.assertKind(['select', 'update', 'delete'], 'whereGroup');
    return this.appendGroup(build, 'and', 'whereGroup');
  }

  /**
   * Appends a parenthesized WHERE group joined with `OR`.
   *
   * Same callback rules as {@link whereGroup}. When this group is the first
   * WHERE entry, the leading `OR` is omitted.
   *
   * Available for `SELECT`, `UPDATE`, and `DELETE` statements.
   *
   * @param build - Callback that returns the grouped WHERE chain.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`,
   *   when {@link build} does not return a builder, when the callback calls a
   *   non-WHERE method, or when the group has no conditions.
   */
  public orWhereGroup(
    build: (query: AthenaQueryBuilder) => AthenaQueryBuilder,
  ): AthenaQueryBuilder {
    this.assertKind(['select', 'update', 'delete'], 'orWhereGroup');
    return this.appendGroup(build, 'or', 'orWhereGroup');
  }

  /**
   * Appends a WHERE predicate joined with `AND`.
   *
   * Callers must run {@link assertKind} first. An unset kind becomes `select`.
   *
   * @param sql - SQL predicate fragment.
   * @returns A new builder instance.
   */
  private appendPredicate(sql: string): AthenaQueryBuilder {
    return this.appendClause({
      join: 'and',
      node: { kind: 'predicate', sql },
    });
  }

  /**
   * Appends one WHERE entry to the current SELECT, UPDATE, or DELETE state.
   *
   * Callers must run {@link assertKind} first. An unset kind becomes `select`.
   *
   * @param clause - Predicate or group, including how it joins the previous entry.
   * @returns A new builder instance.
   */
  private appendClause(clause: WhereClause): AthenaQueryBuilder {
    if (this.state.kind === 'update') {
      return this.clone({
        kind: 'update',
        update: {
          ...this.state.update,
          whereClauses: [...this.state.update.whereClauses, clause],
        },
      });
    }
    if (this.state.kind === 'delete') {
      return this.clone({
        kind: 'delete',
        delete: {
          ...this.state.delete,
          whereClauses: [...this.state.delete.whereClauses, clause],
        },
      });
    }
    return this.clone({
      kind: 'select',
      select: {
        ...this.state.select,
        whereClauses: [...this.state.select.whereClauses, clause],
      },
    });
  }

  /**
   * Appends a parenthesized group taken from {@link build}.
   *
   * @param build - Callback that receives an empty builder and returns the group chain.
   * @param join - Combinator with the previous WHERE entry.
   * @param method - Method name used in validation errors.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When {@link build} does not return a builder,
   *   when the callback calls a non-WHERE method, or when the group has no conditions.
   */
  private appendGroup(
    build: (query: AthenaQueryBuilder) => AthenaQueryBuilder,
    join: WhereJoin,
    method: WhereGroupMethod,
  ): AthenaQueryBuilder {
    return this.appendClause({
      join,
      node: {
        kind: 'group',
        clauses: this.clausesFromGroup(build, method),
      },
    });
  }

  /**
   * Runs a WHERE group callback and returns its clauses.
   *
   * The callback starts from an empty builder so outer SELECT, UPDATE, or DELETE
   * state cannot leak into the group.
   *
   * @param build - Callback that receives an empty builder and returns the group chain.
   * @param method - Method name used in validation errors.
   * @returns Clauses collected by the callback.
   * @throws {AthenaQueryBuilderValidateError} When {@link build} does not return a builder,
   *   when the callback calls a non-WHERE method, or when the group has no conditions.
   */
  private clausesFromGroup(
    build: (query: AthenaQueryBuilder) => AthenaQueryBuilder,
    method: WhereGroupMethod,
  ): readonly WhereClause[] {
    const grouped: unknown = build(new AthenaQueryBuilder());
    if (!(grouped instanceof AthenaQueryBuilder)) {
      throw new AthenaQueryBuilderValidateError(
        `${method}() callback must return an AthenaQueryBuilder`,
      );
    }
    if (!isWhereOnlyState(grouped.state)) {
      throw new AthenaQueryBuilderValidateError(
        `${method}() callback must only call WHERE methods`,
      );
    }

    const clauses = grouped.state.select.whereClauses;
    if (clauses.length === 0) {
      throw new AthenaQueryBuilderValidateError(
        `${method}() requires at least one condition`,
      );
    }
    return clauses;
  }

  /**
   * Appends one or more ORDER BY entries.
   *
   * @param column - Column name when using the two-argument form.
   * @param direction - Sort direction when using the two-argument form.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, `UPDATE`, or
   *   `DELETE`, when {@link direction} is not `'asc'` or `'desc'`, or when
   *   {@link column} is not a valid identifier.
   */
  public orderBy(column: string, direction: OrderDirection): AthenaQueryBuilder;
  /**
   * Appends multiple ORDER BY entries from an array.
   *
   * @param entries - Column and direction pairs.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, `UPDATE`, or
   *   `DELETE`, when a direction is not `'asc'` or `'desc'`, or when a column
   *   name is not a valid identifier.
   */
  public orderBy(entries: readonly OrderByEntry[]): AthenaQueryBuilder;
  /**
   * @param columnOrEntries - Column name or list of sort entries.
   * @param direction - Required when the first argument is a column name.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, `UPDATE`, or
   *   `DELETE`, when the two-argument form is used without {@link direction},
   *   when a direction is not `'asc'` or `'desc'`, or when a column name is not
   *   a valid identifier.
   */
  public orderBy(
    columnOrEntries: string | readonly OrderByEntry[],
    direction?: OrderDirection,
  ): AthenaQueryBuilder {
    this.assertKind('select', 'orderBy');
    if (typeof columnOrEntries === 'string') {
      if (direction === undefined) {
        throw new AthenaQueryBuilderValidateError('orderBy requires a direction when given a column name');
      }
      return this.clone({
        kind: 'select',
        select: {
          ...this.state.select,
          orderByClauses: [
            ...this.state.select.orderByClauses,
            {
              column: assertIdentifier.execute(columnOrEntries),
              direction: assertOrderDirection(direction),
            },
          ],
        },
      });
    }
    const entries = columnOrEntries.map((e) => ({
      column: assertIdentifier.execute(e.column),
      direction: assertOrderDirection(e.direction),
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
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `INSERT`, `UPDATE`, or
   *   `DELETE`, or when {@link n} is not a non-negative integer.
   */
  public limit(n: number): AthenaQueryBuilder {
    this.assertKind('select', 'limit');
    if (!Number.isInteger(n) || n < 0) {
      throw new AthenaQueryBuilderValidateError(`limit must be a non-negative integer, got: ${n}`);
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
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `SELECT`, `UPDATE`, or
   *   `DELETE`, or when {@link table} is not a valid identifier.
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
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `SELECT`, `UPDATE`, or
   *   `DELETE`, or when a row has no columns.
   */
  public values(row: InsertRow): AthenaQueryBuilder;
  /**
   * Appends multiple rows to insert.
   *
   * @param rows - Row objects that share the same column keys as the first row.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `SELECT`, `UPDATE`, or
   *   `DELETE`, or when a row has no columns.
   */
  public values(rows: readonly InsertRow[]): AthenaQueryBuilder;
  /**
   * @param rowOrRows - A single row or an array of rows.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `SELECT`, `UPDATE`, or
   *   `DELETE`, or when a row has no columns.
   */
  public values(
    rowOrRows: InsertRow | readonly InsertRow[],
  ): AthenaQueryBuilder {
    this.assertKind('insert', 'values');
    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    for (const row of rows) {
      if (Object.keys(row).length === 0) {
        throw new AthenaQueryBuilderValidateError('values() requires at least one column per row');
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
   * Sets the target table for UPDATE.
   *
   * @param table - Table name validated as an identifier.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `SELECT`, `INSERT`, or
   *   `DELETE`, or when {@link table} is not a valid identifier.
   */
  public update(table: string): AthenaQueryBuilder {
    this.assertKind('update', 'update');
    assertIdentifier.execute(table);
    return this.clone({
      kind: 'update',
      update: { ...this.state.update, table },
    });
  }

  /**
   * Sets column assignments for `UPDATE ... SET`.
   *
   * Multiple calls merge assignments; later values override earlier ones for
   * the same column.
   *
   * @param assignments - Column name to scalar literal map.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `SELECT`, `INSERT`, or
   *   `DELETE`, or when {@link assignments} has no columns.
   */
  public set(assignments: UpdateAssignments): AthenaQueryBuilder {
    this.assertKind('update', 'set');
    if (Object.keys(assignments).length === 0) {
      throw new AthenaQueryBuilderValidateError('set() requires at least one column assignment');
    }
    return this.clone({
      kind: 'update',
      update: {
        ...this.state.update,
        assignments: {
          ...this.state.update.assignments,
          ...assignments,
        },
      },
    });
  }

  /**
   * Sets the target table for DELETE.
   *
   * @param table - Table name validated as an identifier.
   * @returns A new builder instance.
   * @throws {AthenaQueryBuilderValidateError} When the builder is configured for `SELECT`, `INSERT`, or
   *   `UPDATE`, or when {@link table} is not a valid identifier.
   */
  public delete(table: string): AthenaQueryBuilder {
    this.assertKind('delete', 'delete');
    assertIdentifier.execute(table);
    return this.clone({
      kind: 'delete',
      delete: { ...this.state.delete, table },
    });
  }

  /**
   * Builds the final Athena SQL string.
   *
   * @returns Complete `SELECT`, `INSERT`, `UPDATE`, or `DELETE` statement.
   * @throws {AthenaQueryBuilderValidateError} When required chain methods were not called, when statement
   *   kinds are mixed, or when identifiers are invalid.
   */
  public toSql(): string {
    if (this.state.kind === 'insert') {
      return renderInsertSql(this.state.insert);
    }
    if (this.state.kind === 'update') {
      return renderUpdateSql(this.state.update);
    }
    if (this.state.kind === 'delete') {
      return renderDeleteSql(this.state.delete);
    }
    if (this.state.kind === 'select') {
      return renderSelectSql(this.state.select);
    }
    throw new AthenaQueryBuilderValidateError(
      'select(), into(), update(), or delete() is required before toSql()',
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
