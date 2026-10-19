/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  GraphDataParams,
  GraphDataResult,
  ProfilingStartParams,
  ProfilingStartResult,
  ProfilingStatusParams,
  ProfilingStatusResult,
  ProfilingStopParams,
  ProfilingStopResult,
} from '@salesforce/apex-lsp-shared';
import type { ApexClientCore } from '@salesforce/apex-lsp-client';

type ExtensionServerClient = Pick<ApexClientCore, 'request'>;

export const requestGraphData = (
  client: ExtensionServerClient,
  params: GraphDataParams,
): Promise<GraphDataResult> => client.request('apex/graphData', params);

export const startProfiling = (
  client: ExtensionServerClient,
  params: ProfilingStartParams,
): Promise<ProfilingStartResult> =>
  client.request('apex/profiling/start', params);

export const stopProfiling = (
  client: ExtensionServerClient,
  params: ProfilingStopParams,
): Promise<ProfilingStopResult> =>
  client.request('apex/profiling/stop', params);

export const getProfilingStatus = (
  client: ExtensionServerClient,
  params: ProfilingStatusParams,
): Promise<ProfilingStatusResult> =>
  client.request('apex/profiling/status', params);
