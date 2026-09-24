/**
 * Message for a chain method the caller must invoke before `toSql()`.
 *
 * @param method - Builder method name, without parentheses.
 * @returns Error message ending in `is required before toSql()`.
 */
export const requiredCall = (method: string): string =>
  `${method}() is required before toSql()`;
