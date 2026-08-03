import { AthenaQueryBuilder } from '../../src';

describe('AthenaQueryBuilder (INSERT)', () => {
  test('should generate minimal INSERT with one row', () => {
    const sql = new AthenaQueryBuilder()
      .into('example_table')
      .values({ example_id: 'ex-1' })
      .toSql();

    expect(sql).toBe(`INSERT INTO example_table (example_id)
VALUES ('ex-1')`);
  });

  test('should escape string literals in values', () => {
    const sql = new AthenaQueryBuilder()
      .into('example_table')
      .values({ example_name: "O'Brien" })
      .toSql();

    expect(sql).toBe(`INSERT INTO example_table (example_name)
VALUES ('O''Brien')`);
  });

  test('should support number, boolean, and null scalars', () => {
    const sql = new AthenaQueryBuilder()
      .into('example_table')
      .values({
        example_count: 3,
        example_active: true,
        deleted_at: null,
      })
      .toSql();

    expect(sql).toBe(`INSERT INTO example_table (example_count, example_active, deleted_at)
VALUES (3, TRUE, NULL)`);
  });

  test('should insert multiple rows in one statement', () => {
    const sql = new AthenaQueryBuilder()
      .into('example_table')
      .values([
        { example_id: 'ex-1', example_value: 'a' },
        { example_id: 'ex-2', example_value: 'b' },
      ])
      .toSql();

    expect(sql).toBe(`INSERT INTO example_table (example_id, example_value)
VALUES ('ex-1', 'a'), ('ex-2', 'b')`);
  });

  test('should append rows across multiple values() calls', () => {
    const sql = new AthenaQueryBuilder()
      .into('example_table')
      .values({ example_id: 'ex-1' })
      .values({ example_id: 'ex-2' })
      .toSql();

    expect(sql).toBe(`INSERT INTO example_table (example_id)
VALUES ('ex-1'), ('ex-2')`);
  });

  test('should keep branches immutable without affecting each other', () => {
    const base = new AthenaQueryBuilder().into('example_table');

    const rowA = base.values({ example_id: 'ex-a' });
    const rowB = base.values({ example_id: 'ex-b' });

    expect(rowA.toSql()).toBe(`INSERT INTO example_table (example_id)
VALUES ('ex-a')`);
    expect(rowB.toSql()).toBe(`INSERT INTO example_table (example_id)
VALUES ('ex-b')`);
    expect(() => base.toSql()).toThrow('values()');
  });

  test('should return the same SQL from build() and toSql()', () => {
    const builder = new AthenaQueryBuilder()
      .into('example_table')
      .values({ example_id: 'ex-1' });
    expect(builder.build()).toBe(builder.toSql());
  });

  test('should throw when into or values is missing', () => {
    expect(() =>
      new AthenaQueryBuilder().values({ example_id: 'ex-1' }).toSql(),
    ).toThrow('into()');
    expect(() => new AthenaQueryBuilder().into('example_table').toSql()).toThrow(
      'values()',
    );
  });

  test('should throw when row has no columns', () => {
    expect(() =>
      new AthenaQueryBuilder().into('example_table').values({}).toSql(),
    ).toThrow('at least one column');
  });

  test('should reject invalid identifiers', () => {
    expect(() =>
      new AthenaQueryBuilder()
        .into('bad-column')
        .values({ example_id: 'ex-1' })
        .toSql(),
    ).toThrow('Invalid SQL identifier');
  });

  test('should reject mixing INSERT with SELECT methods', () => {
    const insertBuilder = new AthenaQueryBuilder()
      .into('example_table')
      .values({ example_id: 'ex-1' });

    expect(() => insertBuilder.select(['example_id'])).toThrow(
      'not available for insert',
    );
    expect(() => insertBuilder.from('example_table')).toThrow(
      'not available for insert',
    );
  });

  test('should reject mixing INSERT with UPDATE methods', () => {
    const insertBuilder = new AthenaQueryBuilder()
      .into('example_table')
      .values({ example_id: 'ex-1' });

    expect(() => insertBuilder.update('example_table')).toThrow(
      'not available for insert',
    );
    expect(() => insertBuilder.set({ example_value: 'hello' })).toThrow(
      'not available for insert',
    );
  });

  test('should reject mixing INSERT with DELETE methods', () => {
    const insertBuilder = new AthenaQueryBuilder()
      .into('example_table')
      .values({ example_id: 'ex-1' });

    expect(() => insertBuilder.delete('example_table')).toThrow(
      'not available for insert',
    );
  });
});
