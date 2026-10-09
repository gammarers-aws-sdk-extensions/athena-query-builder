/**
 * WHERE clause tree shared by SELECT, UPDATE, and DELETE builders.
 *
 * Predicates stay flat. Groups keep their own child list so `OR` can be
 * parenthesized without changing the surrounding `AND` chain.
 *
 * @module builders/internal
 */

/** How a clause joins the previous sibling. The first clause ignores this. */
export type WhereJoin = 'and' | 'or';

/** One rendered predicate, such as `example_status = 'open'`. */
export interface WherePredicateNode {
  readonly kind: 'predicate';
  readonly sql: string;
}

/**
 * A parenthesized group.
 *
 * The parentheses are always emitted so a group is one unit for the parent
 * combinator. SQL still treats `AND` as tighter than `OR` between siblings.
 */
export interface WhereGroupNode {
  readonly kind: 'group';
  readonly clauses: readonly WhereClause[];
}

/** Predicate or parenthesized group. */
export type WhereNode = WherePredicateNode | WhereGroupNode;

/**
 * One WHERE entry.
 *
 * `join` is the combinator with the previous sibling. Rendering skips it on
 * the first entry, so a leading `or` does not emit a bare `OR`.
 */
export interface WhereClause {
  readonly join: WhereJoin;
  readonly node: WhereNode;
}

/** SQL keyword for {@link WhereJoin}. */
const WHERE_JOIN_SQL: Record<WhereJoin, string> = {
  and: 'AND',
  or: 'OR',
};

/**
 * Renders a WHERE body without the `WHERE` keyword.
 *
 * @param clauses - Predicate and group entries. The first entry's `join` is ignored.
 * @returns SQL such as `a = 1 AND (b = 2 OR c = 3)`.
 */
export const renderWhereBody = (clauses: readonly WhereClause[]): string =>
  clauses
    .map((clause, index) => {
      const body = renderWhereNode(clause.node);
      if (index === 0) {
        return body;
      }
      return `${WHERE_JOIN_SQL[clause.join]} ${body}`;
    })
    .join(' ');

const renderWhereNode = (node: WhereNode): string => {
  if (node.kind === 'predicate') {
    return node.sql;
  }
  return `(${renderWhereBody(node.clauses)})`;
};
