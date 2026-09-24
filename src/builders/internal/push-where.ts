/** Separator for predicates this builder can combine. `OR` is not supported. */
const WHERE_AND = ' AND ';

/**
 * Appends `WHERE ... AND ...` when the builder collected any predicates.
 *
 * @param parts - SQL lines accumulated for the statement.
 * @param clauses - Predicate fragments, already rendered.
 */
export const pushWhere = (
  parts: string[],
  clauses: readonly string[],
): void => {
  if (clauses.length === 0) {
    return;
  }
  parts.push(`WHERE ${clauses.join(WHERE_AND)}`);
};
