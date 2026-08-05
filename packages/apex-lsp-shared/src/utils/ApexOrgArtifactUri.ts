/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { URI } from 'vscode-uri';

export type ApexOrgArtifactKind = 'apex-class' | 'trigger';

/** Construct the canonical virtual-document URI used for org artifacts. */
export const createApexOrgArtifactUri = (
  kind: ApexOrgArtifactKind,
  fullName: string,
): string =>
  URI.from({
    scheme: 'apex-org-artifact',
    path: `/${kind}/${fullName.trim().toLowerCase()}${
      kind === 'apex-class' ? '.cls' : '.trigger'
    }`,
  }).toString();
