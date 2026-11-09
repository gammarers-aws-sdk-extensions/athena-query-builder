import { AthenaQueryBuilderValidateError } from './errors';
import type { QuoteString } from './quote-string';
import type { SqlTypedLiteral } from './scalar';

/** `YYYY-MM-DD`, captured so the calendar date can be checked. */
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `HH:MM:SS` with an optional fraction of 1–9 digits. */
const TIME_PATTERN = /^(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?$/;

/**
 * Timestamp text: date, space, time, then an optional zone token.
 *
 * The zone is validated separately so `UTC` and `±HH:MM` stay allow-listed.
 * The `T` separator is rejected. Athena's typed literal uses a space.
 */
const TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?)(?: (\S+))?$/;

/** Decimal text. An exponent would be a different literal, so it is rejected. */
const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/** Optional `±HH:MM` zone after a timestamp. `UTC` is checked separately. */
const ZONE_OFFSET_PATTERN = /^[+-](\d{2}):(\d{2})$/;

/** Largest hour, minute, or second component accepted in a time literal. */
const MAX_HOUR = 23;
const MAX_MINUTE_OR_SECOND = 59;

/** SQL keywords for {@link SqlTypedLiteral}. */
const TYPED_LITERAL_SQL: Record<SqlTypedLiteral['kind'], string> = {
  date: 'DATE',
  time: 'TIME',
  timestamp: 'TIMESTAMP',
  decimal: 'DECIMAL',
};

/**
 * Renders a typed literal after checking that its text cannot change the SQL type.
 *
 * @param literal - Date, time, timestamp, or decimal literal.
 * @param quoteString - Quoter for the literal body. The body is validated first.
 * @returns SQL such as `DATE '2024-01-15'`.
 * @throws {AthenaQueryBuilderValidateError} When the kind or value is not a supported literal.
 */
export const formatTypedLiteral = (
  literal: SqlTypedLiteral,
  quoteString: QuoteString,
): string => {
  assertTypedLiteral(literal);
  const keyword = TYPED_LITERAL_SQL[literal.kind];
  return `${keyword} ${quoteString.execute(literal.value)}`;
};

const isTypedLiteralKind = (kind: string): kind is SqlTypedLiteral['kind'] =>
  kind === 'date' || kind === 'time' || kind === 'timestamp' || kind === 'decimal';

const assertTypedLiteral = (literal: SqlTypedLiteral): void => {
  if (typeof literal.value !== 'string') {
    throw new AthenaQueryBuilderValidateError('Typed literal value must be a string');
  }

  // Widen so a non-TypeScript caller cannot fall through into the wrong keyword.
  const kind: string = literal.kind;
  if (!isTypedLiteralKind(kind)) {
    throw new AthenaQueryBuilderValidateError(`Invalid typed literal kind: ${kind}`);
  }
  if (kind === 'date') {
    assertDate(literal.value);
    return;
  }
  if (kind === 'time') {
    assertTime(literal.value);
    return;
  }
  if (kind === 'timestamp') {
    assertTimestamp(literal.value);
    return;
  }
  assertDecimal(literal.value);
};

const assertDate = (value: string): void => {
  if (isValidDate(value)) {
    return;
  }
  throw new AthenaQueryBuilderValidateError(`Invalid DATE literal: ${value}`);
};

const assertTime = (value: string): void => {
  if (isValidTime(value)) {
    return;
  }
  throw new AthenaQueryBuilderValidateError(`Invalid TIME literal: ${value}`);
};

const assertTimestamp = (value: string): void => {
  const match = TIMESTAMP_PATTERN.exec(value);
  if (match !== null && isValidDate(match[1]) && isValidTime(match[2]) && isValidZone(match[3])) {
    return;
  }
  throw new AthenaQueryBuilderValidateError(`Invalid TIMESTAMP literal: ${value}`);
};

const assertDecimal = (value: string): void => {
  if (DECIMAL_PATTERN.test(value)) {
    return;
  }
  throw new AthenaQueryBuilderValidateError(`Invalid DECIMAL literal: ${value}`);
};

/**
 * Accepts a real calendar date. Overflow days roll into the next month, so the
 * round-trip must match the original components.
 *
 * `setUTCFullYear` is required because `Date.UTC` maps years 0–99 to 1900–1999.
 */
const isValidDate = (value: string): boolean => {
  const match = DATE_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(0);
  utc.setUTCFullYear(year, month - 1, day);
  return utc.getUTCFullYear() === year
    && utc.getUTCMonth() === month - 1
    && utc.getUTCDate() === day;
};

const isValidTime = (value: string): boolean => {
  const match = TIME_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3]);
  return hour <= MAX_HOUR && minute <= MAX_MINUTE_OR_SECOND && second <= MAX_MINUTE_OR_SECOND;
};

const isValidZone = (zone: string | undefined): boolean => {
  if (zone === undefined || zone === 'UTC') {
    return true;
  }
  const match = ZONE_OFFSET_PATTERN.exec(zone);
  if (match === null) {
    return false;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= MAX_HOUR && minute <= MAX_MINUTE_OR_SECOND;
};
