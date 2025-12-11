/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { build, context, type BuildOptions } from 'esbuild';

export interface RunBuildsOptions {
  watch?: boolean;
  /**
   * Optional hook to run after a successful build or rebuild.
   */
  afterBuild?: () => void | Promise<void>;
  /**
   * Optional error handler for rebuild failures.
   */
  onError?: (error: unknown) => void;
}

/**
 * Run a set of esbuild configurations either once or in watch mode.
 * This helper is kept generic so it can be reused outside this repo.
 */
export async function runBuilds(
  builds: BuildOptions[],
  { watch = false, afterBuild, onError }: RunBuildsOptions = {},
): Promise<void> {
  if (watch) {
    const contexts = await Promise.all(
      builds.map((options) => context(options)),
    );
    await Promise.all(contexts.map((ctx) => ctx.rebuild()));
    if (afterBuild) {
      await afterBuild();
    }

    await Promise.all(
      contexts.map((ctx) =>
        ctx.watch({
          async onRebuild(error) {
            if (error) {
              onError?.(error);
              return;
            }
            if (afterBuild) {
              await afterBuild();
            }
          },
        }),
      ),
    );
    return;
  }

  await Promise.all(builds.map((options) => build(options)));
  if (afterBuild) {
    await afterBuild();
  }
}
