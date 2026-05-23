/** Pattern for unquoted SQL identifiers in Phase 1 (alphanumeric, dot, underscore). */
const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

/**
 * Validates and returns an unquoted SQL identifier for Athena/Presto-style SQL.
 */
export class AssertIdentifier {
  /**
   * Ensures {@link name} is a safe unquoted identifier and returns it unchanged.
   *
   * @param name - Table or column name (e.g. `example_table`, `example_table.col`).
   * @returns The validated identifier string.
   * @throws {Error} When the name contains invalid characters.
   */
  public execute(name: string): string {
    if (!IDENTIFIER_PATTERN.test(name)) {
      throw new Error(`Invalid SQL identifier: ${name}`);
    }
    return name;
  }
}
