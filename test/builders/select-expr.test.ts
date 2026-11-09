import {
  AthenaQueryBuilder,
  AthenaQueryBuilderValidateError,
  type CaseCompareOp,
  type CastType,
  type DateTruncUnit,
  type SelectExpr,
} from '../../src';

describe('AthenaQueryBuilder SELECT expressions', () => {
  test('should render count, sum, lower, and aliases', () => {
    const sql = new AthenaQueryBuilder()
      .select([
        { expr: { kind: 'count' }, as: 'row_count' },
        { expr: { kind: 'count', column: 'example_id' } },
        { expr: { kind: 'sum', column: 'example_amount' }, as: 'total_amount' },
        { expr: { kind: 'lower', column: 'example_name' } },
      ])
      .from('example_table')
      .toSql();

    expect(sql).toBe(`SELECT COUNT(*) AS row_count, COUNT(example_id), SUM(example_amount) AS total_amount, LOWER(example_name)
FROM example_table`);
  });

  test('should nest DATE_TRUNC inside CAST', () => {
    const sql = new AthenaQueryBuilder()
      .select([
        {
          expr: {
            kind: 'cast',
            column: { kind: 'dateTrunc', unit: 'day', column: 'created_at' },
            type: 'date',
          },
          as: 'created_day',
        },
        {
          expr: {
            kind: 'cast',
            column: 'example_amount',
            type: { name: 'decimal', precision: 10, scale: 2 },
          },
        },
      ])
      .from('example_table')
      .toSql();

    expect(sql).toBe(`SELECT CAST(DATE_TRUNC('day', created_at) AS date) AS created_day, CAST(example_amount AS decimal(10, 2))
FROM example_table`);
  });

  test('should render searched CASE with null checks and a column result', () => {
    const sql = new AthenaQueryBuilder()
      .select([
        {
          expr: {
            kind: 'case',
            when: [
              { column: 'status', op: '=', value: 'open', then: 'active' },
              { column: 'deleted_at', op: '=', value: null, then: { column: 'fallback_label' } },
              { column: 'deleted_at', op: '<>', value: null, then: 'present' },
            ],
            else: { kind: 'date', value: '2024-01-01' },
          },
          as: 'label',
        },
      ])
      .from('example_table')
      .toSql();

    const selectList = [
      "SELECT CASE WHEN status = 'open' THEN 'active'",
      'WHEN deleted_at IS NULL THEN fallback_label',
      "WHEN deleted_at IS NOT NULL THEN 'present'",
      "ELSE DATE '2024-01-01' END AS label",
    ].join(' ');
    expect(sql).toBe(`${selectList}\nFROM example_table`);
  });

  test('should keep a plain date string as VARCHAR and render a DATE literal', () => {
    const sql = new AthenaQueryBuilder()
      .select(['example_id'])
      .from('example_table')
      .whereEq('created_on', '2024-01-15')
      .whereGte('created_at', { kind: 'timestamp', value: '2024-01-15 00:00:00' })
      .whereEq('starts_on', { kind: 'date', value: '2024-01-15' })
      .toSql();

    expect(sql).toBe(`SELECT example_id
FROM example_table
WHERE created_on = '2024-01-15' AND created_at >= TIMESTAMP '2024-01-15 00:00:00' AND starts_on = DATE '2024-01-15'`);
  });

  test('should reject an empty CASE, a bad unit, a bad cast, and a null inequality', () => {
    const base = new AthenaQueryBuilder().from('example_table');

    expect(() => base.select([{ expr: { kind: 'case', when: [] } }]).toSql()).toThrow(
      'CASE requires at least one WHEN',
    );
    // These casts stand in for JavaScript callers, which the public unions cannot express.
    expect(() => base.select([{
      expr: { kind: 'dateTrunc', unit: 'century' as DateTruncUnit, column: 'created_at' },
    }]).toSql()).toThrow('Invalid DATE_TRUNC unit');
    expect(() => base.select([{
      expr: { kind: 'cast', column: 'example_amount', type: 'varchar(10)' as CastType },
    }]).toSql()).toThrow('Invalid CAST type');
    expect(() => base.select([{
      expr: {
        kind: 'cast',
        column: 'example_amount',
        type: { name: 'decimal', precision: 2, scale: 3 },
      },
    }]).toSql()).toThrow('Invalid DECIMAL scale');
    expect(() => base.select([{
      expr: {
        kind: 'cast',
        column: 'example_amount',
        type: { name: 'decimal', precision: 39, scale: 0 },
      },
    }]).toSql()).toThrow('Invalid DECIMAL precision');
    expect(() => base.select([{
      expr: {
        kind: 'case',
        when: [{ column: 'example_count', op: '<', value: null, then: 'low' }],
      },
    }]).toSql()).toThrow('CASE comparison does not accept null');
    expect(() => base.select([{
      expr: {
        kind: 'case',
        when: [{ column: 'status', op: 'LIKE' as CaseCompareOp, value: 'a', then: 'b' }],
      },
    }]).toSql()).toThrow('Invalid comparison operator');
    expect(() => base.select([{ expr: { kind: 'lower', column: 'bad-name' } }]).toSql()).toThrow(
      'Invalid SQL identifier',
    );
    // Stand-in for a JavaScript caller that supplies a kind outside the union.
    expect(() => base.select([{
      expr: { kind: 'window' } as unknown as SelectExpr,
    }]).toSql()).toThrow('Invalid SELECT expression kind');
  });

  test('should reject an invalid DATE literal when the predicate is built', () => {
    const builder = new AthenaQueryBuilder().select(['example_id']).from('example_table');

    expect(() => builder.whereEq('created_on', { kind: 'date', value: '2024-02-30' })).toThrow(
      AthenaQueryBuilderValidateError,
    );
  });
});
