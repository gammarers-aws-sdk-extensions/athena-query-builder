import { AthenaQueryBuilder } from '../../src';

describe('AthenaQueryBuilder', () => {
  test('should generate minimal SELECT FROM', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table`);
  });

  test('should select with alias object', () => {
    const sql = new AthenaQueryBuilder()
      .select([{ column: 'example_value', as: 'v' }])
      .from('example_table')
      .toSql();

    expect(sql).toBe(`SELECT example_value AS v
FROM example_table`);
  });

  test('should select object column without alias as bare identifier', () => {
    const sql = new AthenaQueryBuilder()
      .select([{ column: 'example_value' }])
      .from('example_table')
      .toSql();

    expect(sql).toBe(`SELECT example_value
FROM example_table`);
  });

  test('should escape string literals in whereEq', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .whereEq('example_name', "O'Brien")
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table
WHERE example_name = 'O''Brien'`);
  });

  test('should support number and null in whereEq', () => {
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

  test('should generate whereIn with values', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .whereIn('example_key', ['ex-1', 'ex-2'])
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table
WHERE example_key IN ('ex-1', 'ex-2')`);
  });

  test('should yield 1=0 for empty whereIn array', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .whereIn('example_key', [])
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table
WHERE 1=0`);
  });

  test('should orderBy a single column', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .orderBy('example_id', 'asc')
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table
ORDER BY example_id ASC`);
  });

  test('should orderBy via array overload', () => {
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

  test('should apply limit', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .limit(10)
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table
LIMIT 10`);
  });

  test('should build full chain with select, from, whereIn, orderBy, and limit', () => {
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

  test('should keep branches immutable without affecting each other', () => {
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

  test('should return the same SQL from build() and toSql()', () => {
    const builder = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table');
    expect(builder.build()).toBe(builder.toSql());
  });

  test('should throw when select or from is missing', () => {
    expect(() => new AthenaQueryBuilder().from('example_table').toSql()).toThrow(
      'select()',
    );
    expect(() => new AthenaQueryBuilder().select(['example_id']).toSql()).toThrow(
      'from()',
    );
  });

  test('should throw when no statement kind is configured', () => {
    expect(() => new AthenaQueryBuilder().toSql()).toThrow(
      'select(), into(), update(), or delete() is required before toSql()',
    );
  });

  test('should throw when orderBy is given a column without direction', () => {
    const builder = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table');
    expect(() => {
      // @ts-expect-error -- exercise runtime guard for missing direction
      builder.orderBy('example_id');
    }).toThrow('orderBy requires a direction');
  });

  test('should throw when limit is not a non-negative integer', () => {
    const builder = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table');
    expect(() => builder.limit(-1)).toThrow(
      'limit must be a non-negative integer',
    );
    expect(() => builder.limit(1.5)).toThrow(
      'limit must be a non-negative integer',
    );
  });

  test('should reject invalid identifiers', () => {
    expect(() =>
      new AthenaQueryBuilder()
        .from('bad-column')
        .select(['example_id'])
        .toSql(),
    ).toThrow('Invalid SQL identifier');
  });

  test('should reject mixing SELECT with INSERT methods', () => {
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

  test('should reject mixing SELECT with UPDATE methods', () => {
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

  test('should reject mixing SELECT with DELETE methods', () => {
    const selectBuilder = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table');

    expect(() => selectBuilder.delete('example_table')).toThrow(
      'not available for select',
    );
  });
});
