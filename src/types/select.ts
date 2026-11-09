import type { WhereScalar } from './scalar';

/**
 * Units accepted by `DATE_TRUNC`.
 *
 * The list is the runtime allow-list. Callers outside TypeScript are rejected
 * when the unit is not one of these names.
 */
export const DATE_TRUNC_UNITS = [
  'millisecond',
  'second',
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'quarter',
  'year',
] as const;

/** One `DATE_TRUNC` unit. */
export type DateTruncUnit = typeof DATE_TRUNC_UNITS[number];

/**
 * `CAST` target types that have no precision or scale.
 */
export const CAST_SIMPLE_TYPES = [
  'boolean',
  'tinyint',
  'smallint',
  'integer',
  'bigint',
  'real',
  'double',
  'varchar',
  'date',
  'time',
  'timestamp',
] as const;

/** A `CAST` target written as a bare type name. */
export type CastSimpleType = typeof CAST_SIMPLE_TYPES[number];

/**
 * `CAST(... AS decimal(precision, scale))`.
 *
 * Precision is 1–38, matching Athena/Trino. Scale is 0 through precision.
 */
export type CastDecimalType = {
  /** Discriminant for a decimal target. */
  readonly name: 'decimal';
  /** Total number of digits, from 1 to 38. */
  readonly precision: number;
  /** Digits after the decimal point, from 0 through {@link precision}. */
  readonly scale: number;
};

/** Target type of a `CAST` expression. */
export type CastType = CastSimpleType | CastDecimalType;

/** Comparison operator used in a searched `CASE` `WHEN`. */
export type CaseCompareOp = '=' | '<>' | '<' | '>' | '<=' | '>=';

/**
 * Value produced by `THEN` or `ELSE`.
 *
 * A `{ column }` object renders as an identifier. Every other value renders
 * through the same scalar rules as `WHERE`.
 */
export type CaseThen =
  | WhereScalar
  | {
    /** Column identifier returned by this branch. */
    readonly column: string;
  };

/**
 * One `WHEN` branch of a searched `CASE`.
 *
 * `null` with `=` / `<>` becomes `IS NULL` / `IS NOT NULL`. Other operators
 * reject `null`, matching `whereLt` and the other inequalities.
 */
export type CaseWhen = {
  /** Column compared in this branch. */
  readonly column: string;
  /** Comparison operator. */
  readonly op: CaseCompareOp;
  /** Right-hand scalar, including typed date, time, and decimal literals. */
  readonly value: WhereScalar;
  /** Result when the comparison matches. */
  readonly then: CaseThen;
};

/**
 * Argument of `SUM`, `LOWER`, `DATE_TRUNC`, and `CAST`.
 *
 * A string is a column identifier. An object is a nested {@link SelectExpr},
 * so `CAST(DATE_TRUNC(...) AS date)` stays inside the builder.
 */
export type SelectExprArg = string | SelectExpr;

/**
 * Expression allowed in a `SELECT` list.
 *
 * `COUNT` takes an optional column. Omit it for `COUNT(*)`. The other
 * functions take a column or a nested expression. `CASE` is the searched form.
 */
export type SelectExpr =
  | {
    /** `COUNT(*)` or `COUNT(column)`. */
    readonly kind: 'count';
    /** Column to count. Omit for `COUNT(*)`. */
    readonly column?: string;
  }
  | {
    /** `SUM(column)`. */
    readonly kind: 'sum';
    /** Column or nested expression to sum. */
    readonly column: SelectExprArg;
  }
  | {
    /** `LOWER(column)`. */
    readonly kind: 'lower';
    /** Column or nested expression to downcase. */
    readonly column: SelectExprArg;
  }
  | {
    /** `DATE_TRUNC(unit, column)`. */
    readonly kind: 'dateTrunc';
    /** Truncation unit, rendered as a string literal. */
    readonly unit: DateTruncUnit;
    /** Column or nested expression to truncate. */
    readonly column: SelectExprArg;
  }
  | {
    /** `CAST(column AS type)`. */
    readonly kind: 'cast';
    /** Column or nested expression to cast. */
    readonly column: SelectExprArg;
    /** Target SQL type. */
    readonly type: CastType;
  }
  | {
    /** Searched `CASE`. */
    readonly kind: 'case';
    /** At least one `WHEN` branch. An empty list is rejected. */
    readonly when: readonly CaseWhen[];
    /** Optional `ELSE` result. Omit it to leave the `CASE` without `ELSE`. */
    readonly else?: CaseThen;
  };

/**
 * A SELECT list entry: a bare identifier, an aliased column, or an expression.
 *
 * @example
 * ```ts
 * 'example_id'
 * { column: 'example_value', as: 'v' }
 * { expr: { kind: 'count' }, as: 'row_count' }
 * { expr: { kind: 'lower', column: 'example_name' }, as: 'name_key' }
 * ```
 */
export type SelectColumn =
  | string
  | {
    /** Source column identifier. */
    column: string;
    /** Optional alias for the SELECT list (`column AS alias`). */
    as?: string;
  }
  | {
    /** Expression rendered in the SELECT list. */
    expr: SelectExpr;
    /** Optional alias (`expr AS alias`). */
    as?: string;
  };

/**
 * Sort direction for ORDER BY clauses.
 */
export type OrderDirection = 'asc' | 'desc';

/**
 * A single ORDER BY column and direction pair.
 */
export type OrderByEntry = {
  /** Column name (validated as an unquoted identifier). */
  readonly column: string;
  /** Sort direction (`asc` or `desc`). */
  readonly direction: OrderDirection;
};
