/**
 * Athena typed literal.
 *
 * A plain string renders as `VARCHAR`. These objects render as `DATE '...'`,
 * `TIME '...'`, `TIMESTAMP '...'`, or `DECIMAL '...'` so the value matches a
 * typed column in comparisons, `INSERT`, and `UPDATE`.
 *
 * @example
 * ```ts
 * { kind: 'date', value: '2024-01-15' }
 * { kind: 'timestamp', value: '2024-01-15 00:00:00 UTC' }
 * { kind: 'decimal', value: '12.50' }
 * ```
 */
export type SqlTypedLiteral =
  | {
    /** SQL `DATE` literal. */
    readonly kind: 'date';
    /** Calendar date `YYYY-MM-DD`. */
    readonly value: string;
  }
  | {
    /** SQL `TIME` literal. */
    readonly kind: 'time';
    /** Time of day `HH:MM:SS` with an optional fraction of up to 9 digits. */
    readonly value: string;
  }
  | {
    /** SQL `TIMESTAMP` literal. */
    readonly kind: 'timestamp';
    /**
     * `YYYY-MM-DD HH:MM:SS` with an optional fraction.
     * An optional `UTC` or `±HH:MM` suffix may follow.
     */
    readonly value: string;
  }
  | {
    /** SQL `DECIMAL` literal. */
    readonly kind: 'decimal';
    /** Optional sign, digits, and an optional fraction. No exponent. */
    readonly value: string;
  };

/**
 * Scalar value accepted in WHERE, INSERT, UPDATE, SET, DELETE, and VALUES clauses.
 */
export type WhereScalar = string | number | boolean | null | SqlTypedLiteral;
