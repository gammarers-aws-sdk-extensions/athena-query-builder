/**
 * @packageDocumentation
 * Fluent SQL builders for AWS Athena (Presto/Trino-style SQL).
 *
 * Provides immutable builders for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`
 * statements, plus low-level utilities for safe identifier validation and
 * scalar literal formatting.
 *
 * @module athena-query-builder
 */
export { AthenaQueryBuilder } from './builders';
export {
  AthenaQueryBuilderError,
  AthenaQueryBuilderValidateError,
} from './core/errors';
export { AssertIdentifier, FormatScalar, QuoteString } from './utils';
export type {
  CaseCompareOp,
  CaseThen,
  CaseWhen,
  CastDecimalType,
  CastSimpleType,
  CastType,
  DateTruncUnit,
  InsertRow,
  OrderByEntry,
  OrderDirection,
  SelectColumn,
  SelectExpr,
  SelectExprArg,
  SqlTypedLiteral,
  UpdateAssignments,
  WhereScalar,
} from './types';