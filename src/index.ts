/**
 * @packageDocumentation
 * Fluent SQL builders for AWS Athena (Presto/Trino-style SQL).
 *
 * Provides immutable builders for `SELECT`, `INSERT`, and `UPDATE` statements, plus
 * low-level utilities for safe identifier validation and scalar literal formatting.
 *
 * @module athena-query-builder
 */
export { AthenaQueryBuilder } from './builders';
export { AssertIdentifier, FormatScalar, QuoteString } from './utils';
export type {
  InsertRow,
  OrderByEntry,
  OrderDirection,
  SelectColumn,
  UpdateAssignments,
  WhereScalar,
} from './types';