/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompletionContext } from '../CompletionProcessingService';
import { Effect } from 'effect';

/**
 * A completion candidate returned by strategies
 */
export interface CompletionCandidate {
  symbol: any;
  relevance: number;
  context: string;
}

/**
 * Interface for completion strategies.
 *
 * Each strategy handles a specific completion context (e.g., member access,
 * general symbol lookup, relationship-based suggestions). The service iterates
 * strategies and delegates to those that can handle the current request context.
 */
export interface CompletionStrategy {
  /**
   * A human-readable name for this strategy (used in logging/debugging)
   */
  readonly name: string;

  /**
   * Determine whether this strategy can handle the given completion context.
   * @param context The analyzed completion context
   * @returns true if this strategy should contribute completions
   */
  canHandle(context: CompletionContext): boolean;

  /**
   * Get completion candidates for the given context.
   * Returns an Effect that yields periodically for cooperative scheduling.
   * @param context The analyzed completion context
   * @returns An Effect producing an array of completion candidates
   */
  getCompletions(
    context: CompletionContext,
  ): Effect.Effect<CompletionCandidate[], never, never>;
}
