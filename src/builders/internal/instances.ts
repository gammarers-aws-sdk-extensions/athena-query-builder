/**
 * Shared {@link AssertIdentifier} and {@link FormatScalar} instances for builders.
 *
 * @module builders/internal
 */
import { AssertIdentifier, FormatScalar } from '../../utils';

/** Shared {@link AssertIdentifier} instance for query builders. */
export const assertIdentifier = new AssertIdentifier();

/** Shared {@link FormatScalar} instance for query builders. */
export const formatScalar = new FormatScalar();
