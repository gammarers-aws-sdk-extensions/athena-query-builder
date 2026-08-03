import { AthenaQueryBuilder } from '../../src';
import { renderDeleteSql } from '../../src/builders/internal/delete-state';

describe('AthenaQueryBuilder (DELETE)', () => {
  test('should generate minimal DELETE FROM', () => {
    const sql = new AthenaQueryBuilder().delete('example_table').toSql();

    expect(sql).toBe('DELETE FROM example_table');
  });

  test('should generate DELETE with whereEq', () => {
    const sql = new AthenaQueryBuilder()
      .delete('example_table')
      .whereEq('example_id', 'ex-1')
      .toSql();

    expect(sql).toBe(`DELETE FROM example_table
WHERE example_id = 'ex-1'`);
  });

  test('should escape string literals in WHERE', () => {
    const sql = new AthenaQueryBuilder()
      .delete('example_table')
      .whereEq('example_label', "it's")
      .toSql();

    expect(sql).toBe(`DELETE FROM example_table
WHERE example_label = 'it''s'`);
  });

  test('should support whereEq with null', () => {
    const sql = new AthenaQueryBuilder()
      .delete('example_table')
      .whereEq('deleted_at', null)
      .toSql();

    expect(sql).toBe(`DELETE FROM example_table
WHERE deleted_at IS NULL`);
  });

  test('should support whereIn', () => {
    const sql = new AthenaQueryBuilder()
      .delete('example_table')
      .whereIn('example_key', ['ex-1', 'ex-2'])
      .toSql();

    expect(sql).toBe(`DELETE FROM example_table
WHERE example_key IN ('ex-1', 'ex-2')`);
  });

  test('should yield 1=0 for empty whereIn array', () => {
    const sql = new AthenaQueryBuilder()
      .delete('example_table')
      .whereIn('example_key', [])
      .toSql();

    expect(sql).toBe(`DELETE FROM example_table
WHERE 1=0`);
  });

  test('should combine whereEq and whereIn', () => {
    const sql = new AthenaQueryBuilder()
      .delete('example_table')
      .whereIn('example_key', ['ex-1', 'ex-2'])
      .whereEq('example_status', 'active')
      .toSql();

    expect(sql).toBe(`DELETE FROM example_table
WHERE example_key IN ('ex-1', 'ex-2') AND example_status = 'active'`);
  });

  test('should keep branches immutable without affecting each other', () => {
    const base = new AthenaQueryBuilder().delete('example_table');

    const withKey = base.whereEq('example_id', 'ex-a');
    const withOther = base.whereEq('example_id', 'ex-b');

    expect(withKey.toSql()).toBe(`DELETE FROM example_table
WHERE example_id = 'ex-a'`);
    expect(withOther.toSql()).toBe(`DELETE FROM example_table
WHERE example_id = 'ex-b'`);
    expect(base.toSql()).toBe('DELETE FROM example_table');
  });

  test('should return the same SQL from build() and toSql()', () => {
    const builder = new AthenaQueryBuilder()
      .delete('example_table')
      .whereEq('example_id', 'ex-1');
    expect(builder.build()).toBe(builder.toSql());
  });

  test('should reject invalid identifiers', () => {
    expect(() => new AthenaQueryBuilder().delete('bad-table').toSql()).toThrow(
      'Invalid SQL identifier',
    );
  });

  test('should throw when renderDeleteSql is called without a table', () => {
    expect(() => renderDeleteSql({ whereClauses: [] })).toThrow('delete()');
  });

  test('should reject mixing DELETE with SELECT methods', () => {
    const deleteBuilder = new AthenaQueryBuilder().delete('example_table');

    expect(() => deleteBuilder.select(['example_id'])).toThrow(
      'not available for delete',
    );
    expect(() => deleteBuilder.from('example_table')).toThrow(
      'not available for delete',
    );
  });

  test('should reject mixing DELETE with INSERT methods', () => {
    const deleteBuilder = new AthenaQueryBuilder().delete('example_table');

    expect(() => deleteBuilder.into('example_table')).toThrow(
      'not available for delete',
    );
    expect(() => deleteBuilder.values({ example_id: 'ex-1' })).toThrow(
      'not available for delete',
    );
  });

  test('should reject mixing DELETE with UPDATE methods', () => {
    const deleteBuilder = new AthenaQueryBuilder().delete('example_table');

    expect(() => deleteBuilder.update('example_table')).toThrow(
      'not available for delete',
    );
    expect(() => deleteBuilder.set({ example_value: 'hello' })).toThrow(
      'not available for delete',
    );
  });
});
