import { AssertIdentifier, FormatScalar, QuoteString } from '../src';

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
      'Invalid SQL identifier',
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
});
