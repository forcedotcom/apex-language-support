/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { I18nSupport } from '../../src/i18n/I18nSupport';

describe('I18nSupport', () => {
  describe('getLabel', () => {
    it('should return formatted message with single parameter', () => {
      const result = I18nSupport.getLabel(
        'invalid.number.parameters',
        32,
      );
      expect(result).toBe('Invalid number of parameters exceeds: 32');
    });

    it('should return formatted message with multiple parameters', () => {
      const result = I18nSupport.getLabel(
        'method.already.exists',
        'doWork',
        '',
        'MyClass',
      );
      expect(result).toBe('Method already defined: doWork  from the type MyClass');
    });

    it('should return formatted message with zero parameter', () => {
      const result = I18nSupport.getLabel('abstract.methods.cannot.have.body');
      expect(result).toBe('Abstract methods cannot have a body');
    });

    it('should handle missing parameters gracefully', () => {
      const result = I18nSupport.getLabel(
        'invalid.number.parameters',
        // Missing argument for {0}
      );
      // Should return template with placeholder if arg missing
      expect(result).toContain('Invalid number of parameters exceeds');
    });

    it('should return !key! for missing message key', () => {
      const result = I18nSupport.getLabel('nonexistent.key');
      expect(result).toBe('!nonexistent.key!');
    });

    it('should handle numeric parameters correctly', () => {
      const result = I18nSupport.getLabel('max.enums.exceeded', 100);
      expect(result).toBe('Maximum number of enum items exceeded: 100');
    });

    it('should handle string parameters correctly', () => {
      const result = I18nSupport.getLabel(
        'illegal.forward.reference',
        'myVariable',
      );
      expect(result).toBe('Illegal forward reference: myVariable');
    });

    it('should handle multiple placeholders in correct order', () => {
      const result = I18nSupport.getLabel(
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
      const result = I18nSupport.getLabel('invalid.number.parameters', 255);
      expect(result).toBe('Invalid number of parameters exceeds: 255');
    });

    it('should handle empty string arguments', () => {
      const result = I18nSupport.getLabel(
        'method.already.exists',
        'methodName',
        '',
        'ClassName',
      );
      expect(result).toContain('methodName');
      expect(result).toContain('ClassName');
    });
  });
});
