import { formatColumnCompare } from './format-where';
import { assertIdentifier, formatScalar } from './instances';
import { AthenaQueryBuilderValidateError } from '../../core/errors';
import {
  CAST_SIMPLE_TYPES,
  DATE_TRUNC_UNITS,
  type CaseThen,
  type CaseWhen,
  type CastDecimalType,
  type CastType,
  type SelectColumn,
  type SelectExpr,
  type SelectExprArg,
} from '../../types';

/** Athena/Trino maximum decimal precision. */
const DECIMAL_MIN_PRECISION = 1;
const DECIMAL_MAX_PRECISION = 38;

/** Allow-lists derived from the public type constants. */
const DATE_TRUNC_UNIT_SET: ReadonlySet<string> = new Set(DATE_TRUNC_UNITS);
const CAST_SIMPLE_TYPE_SET: ReadonlySet<string> = new Set(CAST_SIMPLE_TYPES);

const CASE_NULL_MESSAGE =
  "CASE comparison does not accept null; use '=' or '<>' for null checks";

/**
 * Renders one SELECT list entry.
 *
 * @param col - Column identifier, aliased column, or expression.
 * @returns SQL fragment for the SELECT list.
 * @throws {AthenaQueryBuilderValidateError} When a name, unit, type, or CASE branch is invalid.
 */
export const formatSelectColumn = (col: SelectColumn): string => {
  if (typeof col === 'string') {
    return assertIdentifier.execute(col);
  }
  if ('expr' in col) {
    return withAlias(formatSelectExpr(col.expr), col.as);
  }
  return withAlias(assertIdentifier.execute(col.column), col.as);
};

const withAlias = (sql: string, alias: string | undefined): string => {
  if (alias === undefined) {
    return sql;
  }
  return `${sql} AS ${assertIdentifier.execute(alias)}`;
};

const formatSelectExpr = (expr: SelectExpr): string => {
  if (expr.kind === 'count') {
    return formatCount(expr.column);
  }
  if (expr.kind === 'sum') {
    return `SUM(${formatSelectArg(expr.column)})`;
  }
  if (expr.kind === 'lower') {
    return `LOWER(${formatSelectArg(expr.column)})`;
  }
  if (expr.kind === 'dateTrunc') {
    return formatDateTrunc(expr.unit, expr.column);
  }
  if (expr.kind === 'cast') {
    return `CAST(${formatSelectArg(expr.column)} AS ${formatCastType(expr.type)})`;
  }
  if (expr.kind === 'case') {
    return formatCase(expr.when, expr.else);
  }

  // Reachable only when a non-TypeScript caller supplies an unknown kind.
  const unexpected: { readonly kind: unknown } = expr;
  throw new AthenaQueryBuilderValidateError(
    `Invalid SELECT expression kind: ${String(unexpected.kind)}`,
  );
};

const formatCount = (column: string | undefined): string => {
  if (column === undefined) {
    return 'COUNT(*)';
  }
  return `COUNT(${assertIdentifier.execute(column)})`;
};

const formatSelectArg = (arg: SelectExprArg): string => {
  if (typeof arg === 'string') {
    return assertIdentifier.execute(arg);
  }
  return formatSelectExpr(arg);
};

const formatDateTrunc = (unit: string, column: SelectExprArg): string => {
  if (!DATE_TRUNC_UNIT_SET.has(unit)) {
    throw new AthenaQueryBuilderValidateError(`Invalid DATE_TRUNC unit: ${unit}`);
  }
  return `DATE_TRUNC(${formatScalar.execute(unit)}, ${formatSelectArg(column)})`;
};

const formatCastType = (type: CastType): string => {
  if (typeof type === 'string') {
    if (!CAST_SIMPLE_TYPE_SET.has(type)) {
      throw new AthenaQueryBuilderValidateError(`Invalid CAST type: ${type}`);
    }
    return type;
  }
  return formatDecimalCast(type);
};

const formatDecimalCast = (type: CastDecimalType): string => {
  if (type.name !== 'decimal') {
    throw new AthenaQueryBuilderValidateError(`Invalid CAST type: ${String(type.name)}`);
  }
  assertDecimalPrecision(type.precision);
  assertDecimalScale(type.scale, type.precision);
  return `decimal(${type.precision}, ${type.scale})`;
};

const assertDecimalPrecision = (precision: number): void => {
  if (Number.isInteger(precision) && precision >= DECIMAL_MIN_PRECISION && precision <= DECIMAL_MAX_PRECISION) {
    return;
  }
  throw new AthenaQueryBuilderValidateError(`Invalid DECIMAL precision: ${String(precision)}`);
};

const assertDecimalScale = (scale: number, precision: number): void => {
  if (Number.isInteger(scale) && scale >= 0 && scale <= precision) {
    return;
  }
  throw new AthenaQueryBuilderValidateError(`Invalid DECIMAL scale: ${String(scale)}`);
};

const formatCase = (when: readonly CaseWhen[], otherwise: CaseThen | undefined): string => {
  if (when.length === 0) {
    throw new AthenaQueryBuilderValidateError('CASE requires at least one WHEN');
  }
  const branches = when.map((branch) => formatWhen(branch)).join(' ');
  if (otherwise === undefined) {
    return `CASE ${branches} END`;
  }
  return `CASE ${branches} ELSE ${formatCaseResult(otherwise)} END`;
};

const formatWhen = (when: CaseWhen): string => {
  const condition = formatColumnCompare(when.column, when.op, when.value, CASE_NULL_MESSAGE);
  return `WHEN ${condition} THEN ${formatCaseResult(when.then)}`;
};

/**
 * A `{ column }` result is an identifier. Typed literals are objects too, so
 * a `kind` field keeps them on the scalar path.
 */
const formatCaseResult = (result: CaseThen): string => {
  if (isColumnResult(result)) {
    return assertIdentifier.execute(result.column);
  }
  return formatScalar.execute(result);
};

const isColumnResult = (
  result: CaseThen,
): result is Extract<CaseThen, { readonly column: string }> =>
  typeof result === 'object' && result !== null && 'column' in result && !('kind' in result);
