import { AthenaInsertBuilder } from '../../src';

describe('AthenaInsertBuilder', () => {
  test('generates minimal INSERT with one row', () => {
    const sql = new AthenaInsertBuilder()
      .into('example_table')
      .values({ example_id: 'ex-1' })
      .toSql();

    expect(sql).toBe(`INSERT INTO example_table (example_id)
VALUES ('ex-1')`);
  });

  test('escapes string literals in values', () => {
    const sql = new AthenaInsertBuilder()
      .into('example_table')
      .values({ example_name: "O'Brien" })
      .toSql();

    expect(sql).toBe(`INSERT INTO example_table (example_name)
VALUES ('O''Brien')`);
  });

  test('supports number, boolean, and null scalars', () => {
    const sql = new AthenaInsertBuilder()
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

  test('inserts multiple rows in one statement', () => {
    const sql = new AthenaInsertBuilder()
      .into('example_table')
      .values([
        { example_id: 'ex-1', example_value: 'a' },
        { example_id: 'ex-2', example_value: 'b' },
      ])
      .toSql();

    expect(sql).toBe(`INSERT INTO example_table (example_id, example_value)
VALUES ('ex-1', 'a'), ('ex-2', 'b')`);
  });

  test('appends rows across multiple values() calls', () => {
    const sql = new AthenaInsertBuilder()
      .into('example_table')
      .values({ example_id: 'ex-1' })
      .values({ example_id: 'ex-2' })
      .toSql();

    expect(sql).toBe(`INSERT INTO example_table (example_id)
VALUES ('ex-1'), ('ex-2')`);
  });

  test('builder is immutable — branches do not affect each other', () => {
    const base = new AthenaInsertBuilder().into('example_table');

    const rowA = base.values({ example_id: 'ex-a' });
    const rowB = base.values({ example_id: 'ex-b' });

    expect(rowA.toSql()).toBe(`INSERT INTO example_table (example_id)
VALUES ('ex-a')`);
    expect(rowB.toSql()).toBe(`INSERT INTO example_table (example_id)
VALUES ('ex-b')`);
    expect(() => base.toSql()).toThrow('values()');
  });

  test('build() returns same SQL as toSql()', () => {
    const builder = new AthenaInsertBuilder()
      .into('example_table')
      .values({ example_id: 'ex-1' });
    expect(builder.build()).toBe(builder.toSql());
  });

  test('throws when into or values missing', () => {
    expect(() =>
      new AthenaInsertBuilder().values({ example_id: 'ex-1' }).toSql(),
    ).toThrow('into()');
    expect(() => new AthenaInsertBuilder().into('example_table').toSql()).toThrow(
      'values()',
    );
  });

  test('throws when row has no columns', () => {
    expect(() =>
      new AthenaInsertBuilder().into('example_table').values({}).toSql(),
    ).toThrow('at least one column');
  });

  test('rejects invalid identifiers', () => {
    expect(() =>
      new AthenaInsertBuilder()
        .into('bad-column')
        .values({ example_id: 'ex-1' })
        .toSql(),
    ).toThrow('Invalid SQL identifier');
  });
});
