/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { localize, localizeTyped } from '../../src/i18n/messageInstance';

describe('messageInstance', () => {
  describe('localize', () => {
    it('should return formatted message with single parameter', () => {
      const result = localize('invalid.number.parameters', 32);
      expect(result).toBe('Invalid number of parameters exceeds: 32');
    });

    it('should return formatted message with multiple parameters', () => {
      const result = localize('method.already.exists', 'doWork', '', 'MyClass');
      expect(result).toBe(
        'Method already defined: doWork  from the type MyClass',
      );
    });

    it('should return formatted message with zero parameter', () => {
      const result = localize('abstract.methods.cannot.have.body');
      expect(result).toBe('Abstract methods cannot have a body');
    });

    it('should handle missing parameters gracefully', () => {
      const result = localize(
        'invalid.number.parameters',
        // Missing argument for {0}
      );
      // Should return template with placeholder if arg missing
      expect(result).toContain('Invalid number of parameters exceeds');
    });

    it('should return !key! for missing message key', () => {
      const result = localize('nonexistent.key');
      expect(result).toBe('!nonexistent.key!');
    });

    it('should handle numeric parameters correctly', () => {
      const result = localize('max.enums.exceeded', 100);
      expect(result).toBe('Maximum number of enum items exceeded: 100');
    });

    it('should handle string parameters correctly', () => {
      const result = localize('illegal.forward.reference', 'myVariable');
      expect(result).toBe('Illegal forward reference: myVariable');
    });

    it('should handle multiple placeholders in correct order', () => {
      const result = localize(
        'annotation.property.bad.string.value',
        'propertyName',
        'annotationName',
        'badValue',
      );
      expect(result).toContain('propertyName');
      expect(result).toContain('annotationName');
      expect(result).toContain('badValue');
    });

    it('should convert non-string arguments to strings', () => {
      const result = localize('invalid.number.parameters', 255);
      expect(result).toBe('Invalid number of parameters exceeds: 255');
    });

    it('should handle empty string arguments', () => {
      const result = localize(
        'method.already.exists',
        'methodName',
        '',
        'ClassName',
      );
      expect(result).toContain('methodName');
      expect(result).toContain('ClassName');
    });
  });

  describe('getLabelTyped', () => {
    it('should return formatted message with type-safe key', () => {
      const result = localizeTyped('invalid.number.parameters', '32');
      expect(result).toBe('Invalid number of parameters exceeds: 32');
    });

    it('should return formatted message with multiple parameters', () => {
      const result = localizeTyped(
        'method.already.exists',
        'doWork',
        '',
        'MyClass',
      );
      expect(result).toBe(
        'Method already defined: doWork  from the type MyClass',
      );
    });

    it('should return formatted message with zero parameter', () => {
      const result = localizeTyped('abstract.methods.cannot.have.body');
      expect(result).toBe('Abstract methods cannot have a body');
    });

    it('should return !key! for missing message key', () => {
      // @ts-expect-error - Testing invalid key (type error expected)
      const result = localizeTyped('nonexistent.key' as any);
      expect(result).toContain('nonexistent.key');
    });

    it('should handle numeric parameters converted to strings', () => {
      const result = localizeTyped('max.enums.exceeded', '100');
      expect(result).toBe('Maximum number of enum items exceeded: 100');
    });

    it('should handle string parameters correctly', () => {
      const result = localizeTyped('illegal.forward.reference', 'myVariable');
      expect(result).toBe('Illegal forward reference: myVariable');
    });

    it('should handle multiple placeholders in correct order', () => {
      const result = localizeTyped(
        'annotation.property.bad.string.value',
        'propertyName',
        'annotationName',
        'badValue',
      );
      expect(result).toContain('propertyName');
      expect(result).toContain('annotationName');
      expect(result).toContain('badValue');
    });
  });

  describe('placeholder transformation', () => {
    it('should use printf format (%s) instead of MessageFormat ({0})', () => {
      // Verify that messages have been transformed from {0} to %s
      // by checking that the formatted output works correctly
      const result = localizeTyped('invalid.number.parameters', '255');
      expect(result).toBe('Invalid number of parameters exceeds: 255');
      // If transformation worked, %s should be replaced with the argument
      expect(result).not.toContain('%s');
      expect(result).toContain('255');
    });

    it('should handle multiple placeholders correctly after transformation', () => {
      const result = localizeTyped(
        'annotation.property.bad.string.value',
        'prop',
        'annot',
        'value',
      );
      // All placeholders should be replaced
      expect(result).not.toContain('%s');
      expect(result).toContain('prop');
      expect(result).toContain('annot');
      expect(result).toContain('value');
    });
  });
});
