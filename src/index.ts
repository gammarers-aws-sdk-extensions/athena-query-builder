/**
 * @packageDocumentation
 * Fluent SQL builders for AWS Athena (Presto/Trino-style SQL).
 *
 * Provides immutable builders for `SELECT` and `INSERT` statements, plus
 * low-level utilities for safe identifier validation and scalar literal formatting.
 *
 * @module athena-query-builder
 */
export {
  AthenaInsertBuilder,
  AthenaQueryBuilder,
} from './builders';
export { AssertIdentifier, FormatScalar, QuoteString } from './utils';
export type {
  InsertRow,
  OrderByEntry,
  OrderDirection,
  SelectColumn,
  WhereScalar,
} from './types';
