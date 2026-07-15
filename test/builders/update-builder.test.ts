import { AthenaQueryBuilder } from '../../src';

describe('AthenaQueryBuilder (UPDATE)', () => {
  test('generates minimal UPDATE with SET', () => {
    const sql = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_value: 'hello' })
      .toSql();

    expect(sql).toBe(`UPDATE example_table
SET example_value = 'hello'`);
  });

  test('UPDATE with SET and whereEq', () => {
    const sql = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_value: 'hello' })
      .whereEq('example_id', 'ex-1')
      .toSql();

    expect(sql).toBe(`UPDATE example_table
SET example_value = 'hello'
WHERE example_id = 'ex-1'`);
  });

  test('escapes string literals in SET and WHERE', () => {
    const sql = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_name: "O'Brien" })
      .whereEq('example_label', "it's")
      .toSql();

    expect(sql).toBe(`UPDATE example_table
SET example_name = 'O''Brien'
WHERE example_label = 'it''s'`);
  });

  test('supports number, boolean, and null scalars in SET', () => {
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

  test('supports whereIn', () => {
    const sql = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_status: 'archived' })
      .whereIn('example_key', ['ex-1', 'ex-2'])
      .toSql();

    expect(sql).toBe(`UPDATE example_table
SET example_status = 'archived'
WHERE example_key IN ('ex-1', 'ex-2')`);
  });

  test('whereIn empty array yields 1=0', () => {
    const sql = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_status: 'archived' })
      .whereIn('example_key', [])
      .toSql();

    expect(sql).toBe(`UPDATE example_table
SET example_status = 'archived'
WHERE 1=0`);
  });

  test('merges assignments across multiple set() calls', () => {
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

  test('builder is immutable — branches do not affect each other', () => {
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

  test('build() returns same SQL as toSql()', () => {
    const builder = new AthenaQueryBuilder()
      .update('example_table')
      .set({ example_value: 'hello' });
    expect(builder.build()).toBe(builder.toSql());
  });

  test('throws when update or set missing', () => {
    expect(() =>
      new AthenaQueryBuilder().set({ example_value: 'hello' }).toSql(),
    ).toThrow('update()');
    expect(() =>
      new AthenaQueryBuilder().update('example_table').toSql(),
    ).toThrow('set()');
  });

  test('throws when set has no columns', () => {
    expect(() =>
      new AthenaQueryBuilder().update('example_table').set({}).toSql(),
    ).toThrow('at least one column');
  });

  test('rejects invalid identifiers', () => {
    expect(() =>
      new AthenaQueryBuilder()
        .update('bad-table')
        .set({ example_value: 'hello' })
        .toSql(),
    ).toThrow('Invalid SQL identifier');
  });

  test('rejects mixing UPDATE with SELECT methods', () => {
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

  test('rejects mixing UPDATE with INSERT methods', () => {
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
});
