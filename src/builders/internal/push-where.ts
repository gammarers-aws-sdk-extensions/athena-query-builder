import { renderWhereBody, type WhereClause } from './where-clause';

/**
 * Appends `WHERE ...` when the builder collected any clauses.
 *
 * Sibling clauses join with the combinator stored on each clause (`AND` or `OR`).
 * Groups render in parentheses. The first clause does not emit a combinator.
 *
 * @param parts - SQL lines accumulated for the statement.
 * @param clauses - Predicate and group entries, already structured.
 */
export const pushWhere = (
  parts: string[],
  clauses: readonly WhereClause[],
): void => {
  if (clauses.length === 0) {
    return;
  }
  parts.push(`WHERE ${renderWhereBody(clauses)}`);
};
