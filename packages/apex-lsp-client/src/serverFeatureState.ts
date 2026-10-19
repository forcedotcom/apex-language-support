/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/** A server feature's build/platform support and current enabled state. */
export type ApexServerFeatureState = {
  readonly supported: boolean;
  readonly enabled: boolean;
};

export type ApexServerFeatureStates = Readonly<
  Record<string, ApexServerFeatureState>
>;

export const UNSUPPORTED_FEATURE_STATE: ApexServerFeatureState = {
  supported: false,
  enabled: false,
};

/**
 * Reads the server's experimental feature-state snapshot. The server omits
 * unknown features, so callers always receive the false/false fallback.
 */
export function getServerFeatureState(
  states: ApexServerFeatureStates | undefined,
  feature: string,
): ApexServerFeatureState {
  return states?.[feature] ?? UNSUPPORTED_FEATURE_STATE;
}
