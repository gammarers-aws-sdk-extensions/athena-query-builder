import { AthenaQueryBuilder } from '../../src';

describe('AthenaQueryBuilder', () => {
  test('generates minimal SELECT FROM', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table`);
  });

  test('select with alias object', () => {
    const sql = new AthenaQueryBuilder()
      .select([{ column: 'example_value', as: 'v' }])
      .from('example_table')
      .toSql();

    expect(sql).toBe(`SELECT example_value AS v
FROM example_table`);
  });

  test('whereEq escapes string literals', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .whereEq('example_name', "O'Brien")
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table
WHERE example_name = 'O''Brien'`);
  });

  test('whereEq supports number and null', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .whereEq('example_count', 3)
      .whereEq('deleted_at', null)
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table
WHERE example_count = 3 AND deleted_at IS NULL`);
  });

  test('whereIn with values', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .whereIn('example_key', ['ex-1', 'ex-2'])
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table
WHERE example_key IN ('ex-1', 'ex-2')`);
  });

  test('whereIn empty array yields 1=0', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .whereIn('example_key', [])
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table
WHERE 1=0`);
  });

  test('orderBy single column', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .orderBy('example_id', 'asc')
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table
ORDER BY example_id ASC`);
  });

  test('orderBy array overload', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_a', 'example_b'])
      .from('example_table')
      .orderBy([
        { column: 'example_a', direction: 'desc' },
        { column: 'example_b', direction: 'asc' },
      ])
      .toSql();

    expect(sql).toBe(`SELECT example_a, example_b
FROM example_table
ORDER BY example_a DESC, example_b ASC`);
  });

  test('limit', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .limit(10)
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table
LIMIT 10`);
  });

  test('full chain: select, from, whereIn, orderBy, limit', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id', 'example_value'])
      .from('example_table')
      .whereIn('example_key', ['ex-1', 'ex-2'])
      .orderBy('example_id', 'asc')
      .limit(1000)
      .toSql();

    expect(sql).toBe(`SELECT example_id, example_value
FROM example_table
WHERE example_key IN ('ex-1', 'ex-2')
ORDER BY example_id ASC
LIMIT 1000`);
  });

  test('builder is immutable — branches do not affect each other', () => {
    const base = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table');

    const withKey = base.whereIn('example_key', ['ex-a']);
    const withLimit = base.limit(5);

    expect(withKey.toSql()).toBe(`SELECT example_id
FROM example_table
WHERE example_key IN ('ex-a')`);
    expect(withLimit.toSql()).toBe(`SELECT example_id
FROM example_table
LIMIT 5`);
    expect(base.toSql()).toBe(`SELECT example_id
FROM example_table`);
  });

  test('build() returns same SQL as toSql()', () => {
    const builder = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table');
    expect(builder.build()).toBe(builder.toSql());
  });

  test('throws when select or from missing', () => {
    expect(() => new AthenaQueryBuilder().from('example_table').toSql()).toThrow(
      'select()',
    );
    expect(() => new AthenaQueryBuilder().select(['example_id']).toSql()).toThrow(
      'from()',
    );
  });

  test('rejects invalid identifiers', () => {
    expect(() =>
      new AthenaQueryBuilder()
        .from('bad-column')
        .select(['example_id'])
        .toSql(),
    ).toThrow('Invalid SQL identifier');
  });

  test('rejects mixing SELECT with INSERT methods', () => {
    const selectBuilder = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table');

    expect(() => selectBuilder.into('example_table')).toThrow(
      'not available for select',
    );
    expect(() => selectBuilder.values({ example_id: 'ex-1' })).toThrow(
      'not available for select',
    );
  });

  test('rejects mixing SELECT with UPDATE methods', () => {
    const selectBuilder = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table');

    expect(() => selectBuilder.update('example_table')).toThrow(
      'not available for select',
    );
    expect(() => selectBuilder.set({ example_value: 'hello' })).toThrow(
      'not available for select',
    );
  });
});
