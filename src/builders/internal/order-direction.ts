import { AthenaQueryBuilderValidateError } from '../../core/errors';
import type { OrderDirection } from '../../types';

/** SQL keywords for the two sort directions the builder accepts. */
const ORDER_DIRECTION_SQL = {
  asc: 'ASC',
  desc: 'DESC',
} as const;

/**
 * Checks that a sort direction is `asc` or `desc`.
 *
 * JavaScript callers can pass other strings, which must not be interpolated into SQL.
 *
 * @param direction - Value supplied to `orderBy`.
 * @returns The same direction when it is allowed.
 * @throws {AthenaQueryBuilderValidateError} When {@link direction} is not `asc` or `desc`.
 */
export const assertOrderDirection = (direction: string): OrderDirection => {
  if (direction === 'asc' || direction === 'desc') {
    return direction;
  }
  throw new AthenaQueryBuilderValidateError(
    `orderBy direction must be "asc" or "desc", got: ${direction}`,
  );
};

/**
 * Maps a validated sort direction to the SQL keyword.
 *
 * @param direction - `asc` or `desc`.
 * @returns `ASC` or `DESC`.
 * @throws {AthenaQueryBuilderValidateError} When {@link direction} is not `asc` or `desc`.
 */
export const orderDirectionSql = (direction: string): 'ASC' | 'DESC' => {
  const checked = assertOrderDirection(direction);
  return ORDER_DIRECTION_SQL[checked];
};
