/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Default placeholder base used when neither the parent bundle origin nor a
 * client-injected worker URL is usable. It is a syntactically valid absolute
 * URL so `new URL(relative, base)` never throws; the browser layer factory
 * re-wraps the fetched script in a same-origin blob anyway, so the concrete
 * host here does not matter for correctness.
 */
export const PLACEHOLDER_WORKER_BASE = 'file:///server.web.js';

/** Name of the web worker entry script bundled alongside the server. */
export const WEB_WORKER_SCRIPT = 'worker.platform.web.js';

export interface ResolveWebWorkerUrlInput {
  /**
   * `globalThis.location?.href` of the parent server bundle. Used as the base
   * for same-origin worker resolution when it is a usable base.
   */
  readonly locationHref?: unknown;
  /**
   * Absolute worker URL injected by the client (VS Code Web passes the
   * extension-relative URI). Preferred fallback when `locationHref` is unusable.
   */
  readonly injectedWorkerUrl?: string;
  /** Worker script file name. Defaults to {@link WEB_WORKER_SCRIPT}. */
  readonly fileName?: string;
}

/**
 * Resolve the absolute URL of the web worker entry script.
 *
 * Resolution order:
 *  1. `locationHref` as the base — same-origin, no CORS — but ONLY when it is a
 *     usable base. VS Code Web serves the server bundle from a `blob:` URL,
 *     which is NOT a valid base for `new URL(relative, base)` and would throw,
 *     aborting worker-topology init and silently dropping the whole pool
 *     (hover/definition fall back to the coordinator-local path; references —
 *     an empty stub there — return nothing). A `blob:` (or non-string/empty)
 *     href is therefore treated as unusable.
 *  2. The client-injected absolute worker URL.
 *  3. A `file://` placeholder base — always a valid base, so this function
 *     never throws.
 *
 * This is the pure core of the browser branch of
 * `LCSAdapter.startWorkerTopologyIfEnabled`, extracted so the blob-URL
 * regression can be unit-tested without standing up an Effect pipeline.
 */
export function resolveWebWorkerUrl(input: ResolveWebWorkerUrlInput): string {
  const fileName = input.fileName ?? WEB_WORKER_SCRIPT;
  const build = (base: string) => new URL(`./${fileName}`, base).href;

  const href = input.locationHref;
  if (
    typeof href === 'string' &&
    href.length > 0 &&
    !href.startsWith('blob:')
  ) {
    return build(href);
  }

  // `||` (not `??`): an empty string is as unusable a base as undefined, so
  // fall through to the placeholder in both cases.
  return input.injectedWorkerUrl || build(PLACEHOLDER_WORKER_BASE);
}
