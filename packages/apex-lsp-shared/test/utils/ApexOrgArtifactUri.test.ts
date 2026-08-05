/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { createApexOrgArtifactUri } from '../../src/utils/ApexOrgArtifactUri';

describe('createApexOrgArtifactUri', () => {
  it('constructs canonical class and trigger URIs', () => {
    expect(
      createApexOrgArtifactUri('apex-class', 'Billing.RemoteService'),
    ).toBe('apex-org-artifact:/apex-class/billing.remoteservice.cls');
    expect(createApexOrgArtifactUri('trigger', 'AccountTrigger')).toBe(
      'apex-org-artifact:/trigger/accounttrigger.trigger',
    );
  });
});
