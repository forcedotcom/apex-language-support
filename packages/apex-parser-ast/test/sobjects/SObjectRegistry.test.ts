/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SObjectRegistry } from '../../src/sobjects/SObjectRegistry';

describe('SObjectRegistry', () => {
  describe('isCustomSObjectName', () => {
    it.each([
      'Invoice__c',
      'Setting__mdt',
      'Change_Event__e',
      'Archive__b',
      'External__x',
      'Article__kav',
      'Article__ka',
      'Invoice__Share',
      'Invoice__History',
    ])('recognizes the canonical suffix in %s', (name) => {
      expect(SObjectRegistry.isCustomSObjectName(name)).toBe(true);
    });

    it.each([
      'invoice__C',
      'setting__MdT',
      'change_event__E',
      'archive__B',
      'external__X',
      'article__KaV',
      'article__KA',
      'invoice__sHaRe',
      'invoice__hIsToRy',
    ])('matches suffixes case-insensitively in %s', (name) => {
      expect(SObjectRegistry.isCustomSObjectName(name)).toBe(true);
    });

    it.each([
      'acme__Invoice__c',
      'acme__Setting__mdt',
      'acme__Change_Event__e',
      'acme__Invoice__Share',
      'Schema.acme__Invoice__c',
    ])('recognizes namespaced or Schema-qualified name %s', (name) => {
      expect(SObjectRegistry.isCustomSObjectName(name)).toBe(true);
    });

    it.each([
      '',
      '   ',
      '__c',
      '__mdt',
      'Invoice_c',
      'Invoice__r',
      'Invoice__cx',
      'Invoice__cExtra',
      '1Invoice__c',
      'Invoice-Item__c',
      'Account',
      'Invoice__c.Amount__c',
      'Invoice__c.Owner__r',
      'Other.Invoice__c',
      'Schema.Invoice__c.Amount__c',
    ])('rejects near-miss or non-type name %s', (name) => {
      expect(SObjectRegistry.isCustomSObjectName(name)).toBe(false);
    });
  });

  describe('field semantics', () => {
    it.each(['Amount__c', 'acme__Amount__c', 'amount__C'])(
      'recognizes custom field %s',
      (name) => {
        expect(SObjectRegistry.isCustomFieldName(name)).toBe(true);
      },
    );

    it.each(['Owner__r', 'acme__Owner__r', 'owner__R'])(
      'recognizes relationship name %s',
      (name) => {
        expect(SObjectRegistry.isRelationshipName(name)).toBe(true);
      },
    );

    it('keeps fields and relationships distinct from object types', () => {
      expect(SObjectRegistry.isCustomFieldName('Owner__r')).toBe(false);
      expect(SObjectRegistry.isRelationshipName('Amount__c')).toBe(false);
      expect(SObjectRegistry.isCustomSObjectName('Owner__r')).toBe(false);
      expect(SObjectRegistry.isCustomFieldName('Invoice__c.Amount__c')).toBe(
        false,
      );
      expect(SObjectRegistry.isRelationshipName('Invoice__c.Owner__r')).toBe(
        false,
      );
    });
  });
});
