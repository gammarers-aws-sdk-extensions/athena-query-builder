import {
  AthenaQueryBuilderValidateError,
  type InsertRow,
} from '../../src';
import { renderDeleteSql } from '../../src/builders/internal/delete-state';
import { renderInsertSql } from '../../src/builders/internal/insert-state';
import { renderUpdateSql } from '../../src/builders/internal/update-state';

describe('internal statement renderers', () => {
  test('should reject DELETE state without a table', () => {
    expect(() => renderDeleteSql({ whereClauses: [] })).toThrow(
      AthenaQueryBuilderValidateError,
    );
    expect(() => renderDeleteSql({ whereClauses: [] })).toThrow(
      'delete() is required before toSql()',
    );
  });

  test('should reject INSERT rows when the first row is missing', () => {
    const rows = [undefined as unknown as InsertRow];

    expect(() => renderInsertSql({ table: 'example_table', rows })).toThrow(
      'values() is required before toSql()',
    );
  });

  test('should reject UPDATE assignments that are present but empty', () => {
    expect(() => renderUpdateSql({
      table: 'example_table',
      assignments: {},
      whereClauses: [],
    })).toThrow('set() requires at least one column assignment');
  });
});
