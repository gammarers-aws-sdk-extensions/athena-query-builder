import { AthenaQueryBuilder } from '../../src';

describe('AthenaQueryBuilder (UPDATE)', () => {
  test('should generate minimal UPDATE with SET', () => {
    const sql = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_value: 'hello' })
      .toSql();

    expect(sql).toBe(`UPDATE example_table
SET example_value = 'hello'`);
  });

  test('should generate UPDATE with SET and whereEq', () => {
    const sql = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_value: 'hello' })
      .whereEq('example_id', 'ex-1')
      .toSql();

    expect(sql).toBe(`UPDATE example_table
SET example_value = 'hello'
WHERE example_id = 'ex-1'`);
  });

  test('should escape string literals in SET and WHERE', () => {
    const sql = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_name: "O'Brien" })
      .whereEq('example_label', "it's")
      .toSql();

    expect(sql).toBe(`UPDATE example_table
SET example_name = 'O''Brien'
WHERE example_label = 'it''s'`);
  });

  test('should support number, boolean, and null scalars in SET', () => {
    const sql = new AthenaQueryBuilder()
      .update('example_table')
      .set({
        example_count: 3,
        example_active: true,
        deleted_at: null,
      })
      .whereEq('example_id', 'ex-1')
      .toSql();

    expect(sql).toBe(`UPDATE example_table
SET example_count = 3, example_active = TRUE, deleted_at = NULL
WHERE example_id = 'ex-1'`);
  });

  test('should support whereIn', () => {
    const sql = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_status: 'archived' })
      .whereIn('example_key', ['ex-1', 'ex-2'])
      .toSql();

    expect(sql).toBe(`UPDATE example_table
SET example_status = 'archived'
WHERE example_key IN ('ex-1', 'ex-2')`);
  });

  test('should yield 1=0 for empty whereIn array', () => {
    const sql = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_status: 'archived' })
      .whereIn('example_key', [])
      .toSql();

    expect(sql).toBe(`UPDATE example_table
SET example_status = 'archived'
WHERE 1=0`);
  });

  test('should merge assignments across multiple set() calls', () => {
    const sql = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_value: 'a' })
      .set({ example_count: 1 })
      .whereEq('example_id', 'ex-1')
      .toSql();

    expect(sql).toBe(`UPDATE example_table
SET example_value = 'a', example_count = 1
WHERE example_id = 'ex-1'`);
  });

  test('should keep branches immutable without affecting each other', () => {
    const base = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_value: 'base' });

    const withWhere = base.whereEq('example_id', 'ex-a');
    const withOtherSet = base.set({ example_count: 2 });

    expect(withWhere.toSql()).toBe(`UPDATE example_table
SET example_value = 'base'
WHERE example_id = 'ex-a'`);
    expect(withOtherSet.toSql()).toBe(`UPDATE example_table
SET example_value = 'base', example_count = 2`);
    expect(base.toSql()).toBe(`UPDATE example_table
SET example_value = 'base'`);
  });

  test('should return the same SQL from build() and toSql()', () => {
    const builder = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_value: 'hello' });
    expect(builder.build()).toBe(builder.toSql());
  });

  test('should throw when update or set is missing', () => {
    expect(() =>
      new AthenaQueryBuilder().set({ example_value: 'hello' }).toSql(),
    ).toThrow('update()');
    expect(() =>
      new AthenaQueryBuilder().update('example_table').toSql(),
    ).toThrow('set()');
  });

  test('should throw when set has no columns', () => {
    expect(() =>
      new AthenaQueryBuilder().update('example_table').set({}).toSql(),
    ).toThrow('at least one column');
  });

  test('should reject invalid identifiers', () => {
    expect(() =>
      new AthenaQueryBuilder()
        .update('bad-table')
        .set({ example_value: 'hello' })
        .toSql(),
    ).toThrow('Invalid SQL identifier');
  });

  test('should reject mixing UPDATE with SELECT methods', () => {
    const updateBuilder = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_value: 'hello' });

    expect(() => updateBuilder.select(['example_id'])).toThrow(
      'not available for update',
    );
    expect(() => updateBuilder.from('example_table')).toThrow(
      'not available for update',
    );
  });

  test('should reject mixing UPDATE with INSERT methods', () => {
    const updateBuilder = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_value: 'hello' });

    expect(() => updateBuilder.into('example_table')).toThrow(
      'not available for update',
    );
    expect(() => updateBuilder.values({ example_id: 'ex-1' })).toThrow(
      'not available for update',
    );
  });

  test('should reject mixing UPDATE with DELETE methods', () => {
    const updateBuilder = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_value: 'hello' });

    expect(() => updateBuilder.delete('example_table')).toThrow(
      'not available for update',
    );
  });
});
