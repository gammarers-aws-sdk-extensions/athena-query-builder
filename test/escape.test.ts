import { AssertIdentifier, FormatScalar, QuoteString } from '../src';

describe('QuoteString', () => {
  const quoteString = new QuoteString();

  test('wraps value in single quotes', () => {
    expect(quoteString.execute('abc')).toBe("'abc'");
  });

  test('escapes embedded single quotes', () => {
    expect(quoteString.execute("it's")).toBe("'it''s'");
  });
});

describe('AssertIdentifier', () => {
  const assertIdentifier = new AssertIdentifier();

  test('accepts valid identifiers', () => {
    expect(assertIdentifier.execute('col_name')).toBe('col_name');
    expect(assertIdentifier.execute('table.col')).toBe('table.col');
  });

  test('rejects invalid identifiers', () => {
    expect(() => assertIdentifier.execute('bad-column')).toThrow(
      'Invalid SQL identifier',
    );
  });
});

describe('FormatScalar', () => {
  const formatScalar = new FormatScalar();

  test('formats string via QuoteString', () => {
    expect(formatScalar.execute('x')).toBe("'x'");
  });

  test('formats number', () => {
    expect(formatScalar.execute(42)).toBe('42');
  });

  test('formats boolean', () => {
    expect(formatScalar.execute(true)).toBe('TRUE');
    expect(formatScalar.execute(false)).toBe('FALSE');
  });

  test('formats null', () => {
    expect(formatScalar.execute(null)).toBe('NULL');
  });
});
