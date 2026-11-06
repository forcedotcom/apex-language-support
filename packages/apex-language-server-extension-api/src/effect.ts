/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as Schema from 'effect/Schema';
import {
  APEX_EXTENSION_API_VERSION,
  isApexExtensionApi,
  type ApexClient,
  type ApexExtensionApi,
} from './index';

/** Effect schema for the public client while preserving its implementation identity. */
export const ApexClientSchema: Schema.Schema<ApexClient> = Schema.declare(
  (value): value is ApexClient =>
    isApexExtensionApi({
      apiVersion: APEX_EXTENSION_API_VERSION,
      client: value,
    }),
  { identifier: 'ApexClient' },
);

/** Effect schema for an Apex extension activation result. */
export const ApexExtensionApiSchema: Schema.Schema<ApexExtensionApi> =
  Schema.declare(isApexExtensionApi, { identifier: 'ApexExtensionApi' });

export { APEX_EXTENSION_API_VERSION };
