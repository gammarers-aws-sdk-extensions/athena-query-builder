import {
  AssertIdentifier,
  AthenaQueryBuilderValidateError,
  FormatScalar,
  QuoteString,
  type SqlTypedLiteral,
} from '../src';

describe('QuoteString', () => {
  const quoteString = new QuoteString();

  test('should wrap value in single quotes', () => {
    expect(quoteString.execute('abc')).toBe("'abc'");
  });

  test('should escape embedded single quotes', () => {
    expect(quoteString.execute("it's")).toBe("'it''s'");
  });
});

describe('AssertIdentifier', () => {
  const assertIdentifier = new AssertIdentifier();

  test('should accept valid identifiers', () => {
    expect(assertIdentifier.execute('col_name')).toBe('col_name');
    expect(assertIdentifier.execute('table.col')).toBe('table.col');
  });

  test('should reject invalid identifiers', () => {
    expect(() => assertIdentifier.execute('bad-column')).toThrow(
      AthenaQueryBuilderValidateError,
    );
  });
});

describe('FormatScalar', () => {
  const formatScalar = new FormatScalar();

  test('should format string via QuoteString', () => {
    expect(formatScalar.execute('x')).toBe("'x'");
  });

  test('should format number', () => {
    expect(formatScalar.execute(42)).toBe('42');
  });

  test('should format boolean', () => {
    expect(formatScalar.execute(true)).toBe('TRUE');
    expect(formatScalar.execute(false)).toBe('FALSE');
  });

  test('should format null', () => {
    expect(formatScalar.execute(null)).toBe('NULL');
  });

  test('should reject non-finite numbers', () => {
    expect(() => formatScalar.execute(Number.NaN)).toThrow(
      AthenaQueryBuilderValidateError,
    );
    expect(() => formatScalar.execute(Number.POSITIVE_INFINITY)).toThrow(
      AthenaQueryBuilderValidateError,
    );
  });

  test.each([
    [{ kind: 'date' as const, value: '2024-01-15' }, "DATE '2024-01-15'"],
    [{ kind: 'date' as const, value: '2024-02-29' }, "DATE '2024-02-29'"],
    [{ kind: 'date' as const, value: '0001-01-15' }, "DATE '0001-01-15'"],
    [{ kind: 'date' as const, value: '0096-02-29' }, "DATE '0096-02-29'"],
    [{ kind: 'time' as const, value: '12:00:00' }, "TIME '12:00:00'"],
    [{ kind: 'time' as const, value: '00:00:00.123456789' }, "TIME '00:00:00.123456789'"],
    [{ kind: 'timestamp' as const, value: '2024-01-15 00:00:00' }, "TIMESTAMP '2024-01-15 00:00:00'"],
    [{ kind: 'timestamp' as const, value: '2024-01-15 00:00:00 UTC' }, "TIMESTAMP '2024-01-15 00:00:00 UTC'"],
    [{ kind: 'timestamp' as const, value: '2024-01-15 00:00:00 +09:00' }, "TIMESTAMP '2024-01-15 00:00:00 +09:00'"],
    [{ kind: 'timestamp' as const, value: '2024-01-15 00:00:00 -05:30' }, "TIMESTAMP '2024-01-15 00:00:00 -05:30'"],
    [{ kind: 'decimal' as const, value: '12.50' }, "DECIMAL '12.50'"],
    [{ kind: 'decimal' as const, value: '-0.5' }, "DECIMAL '-0.5'"],
    [{ kind: 'decimal' as const, value: '0' }, "DECIMAL '0'"],
  ])('should format typed literal %j', (literal, sql) => {
    expect(formatScalar.execute(literal)).toBe(sql);
  });

  test('should reject a non-string typed literal value and an unknown kind', () => {
    // The public type forbids these shapes. `unknown` is how a JavaScript caller still reaches the checks.
    const badValue = { kind: 'date', value: 1 } as unknown as SqlTypedLiteral;
    const badKind = { kind: 'interval', value: '1' } as unknown as SqlTypedLiteral;

    expect(() => formatScalar.execute(badValue)).toThrow('Typed literal value must be a string');
    expect(() => formatScalar.execute(badKind)).toThrow('Invalid typed literal kind');
  });

  test.each([
    [{ kind: 'date' as const, value: '2023-02-29' }, 'Invalid DATE literal'],
    [{ kind: 'date' as const, value: '0099-02-29' }, 'Invalid DATE literal'],
    [{ kind: 'date' as const, value: '1900-02-29' }, 'Invalid DATE literal'],
    [{ kind: 'date' as const, value: '2024-1-15' }, 'Invalid DATE literal'],
    [{ kind: 'time' as const, value: '24:00:00' }, 'Invalid TIME literal'],
    [{ kind: 'time' as const, value: '12:00:00.1234567890' }, 'Invalid TIME literal'],
    [{ kind: 'timestamp' as const, value: '2024-01-15T00:00:00' }, 'Invalid TIMESTAMP literal'],
    [{ kind: 'timestamp' as const, value: '2024-02-30 00:00:00' }, 'Invalid TIMESTAMP literal'],
    [{ kind: 'timestamp' as const, value: '2024-01-15 00:00:00 utc' }, 'Invalid TIMESTAMP literal'],
    [{ kind: 'timestamp' as const, value: '2024-01-15 00:00:00 GMT' }, 'Invalid TIMESTAMP literal'],
    [{ kind: 'timestamp' as const, value: '2024-01-15 00:00:00 +9:00' }, 'Invalid TIMESTAMP literal'],
    [{ kind: 'timestamp' as const, value: '2024-01-15 00:00:00 +24:00' }, 'Invalid TIMESTAMP literal'],
    [{ kind: 'timestamp' as const, value: '2024-01-15 00:00:00 +09:60' }, 'Invalid TIMESTAMP literal'],
    [{ kind: 'decimal' as const, value: '1e2' }, 'Invalid DECIMAL literal'],
    [{ kind: 'decimal' as const, value: "12.50'" }, 'Invalid DECIMAL literal'],
    [{ kind: 'decimal' as const, value: '+1' }, 'Invalid DECIMAL literal'],
  ])('should reject invalid typed literal %j', (literal, message) => {
    expect(() => formatScalar.execute(literal)).toThrow(message);
  });
});
