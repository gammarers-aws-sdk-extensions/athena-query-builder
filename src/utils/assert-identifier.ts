/** Pattern for unquoted SQL identifiers in Phase 1 (alphanumeric, dot, underscore). */
const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

/**
 * Validates unquoted SQL identifiers for Athena/Presto-style SQL (Phase 1).
 *
 * Allowed characters: alphanumeric, dot, and underscore. Names must start with
 * a letter or underscore.
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
