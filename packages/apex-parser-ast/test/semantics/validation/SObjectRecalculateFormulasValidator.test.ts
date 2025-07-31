/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SObjectRecalculateFormulasValidator } from '../../../src/semantics/validation/SObjectRecalculateFormulasValidator';
import {
  ValidationScope,
  ValidationResult,
} from '../../../src/semantics/validation/ValidationResult';

describe('SObjectRecalculateFormulasValidator', () => {
  let scope: ValidationScope;

  beforeEach(() => {
    scope = {
      supportsLongIdentifiers: true,
      version: 58,
      isFileBased: true,
    };
  });

  describe('validateRecalculateFormulasCall', () => {
    describe('valid cases', () => {
      it('should validate valid recalculateFormulas call with List<SObject>', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<SObject>',
              isSObjectList: true,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate recalculateFormulas call with Account list', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<Account>',
              isSObjectList: true,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate recalculateFormulas call with Contact list', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<Contact>',
              isSObjectList: true,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate recalculateFormulas call with custom SObject list', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<Custom_Object__c>',
              isSObjectList: true,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid cases', () => {
      it('should reject recalculateFormulas call with wrong method name', () => {
        const callInfo = {
          methodName: 'recalculate',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<SObject>',
              isSObjectList: true,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.method',
        );
      });

      it('should reject recalculateFormulas call with wrong class name', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.String',
          parameters: [
            {
              type: 'List<SObject>',
              isSObjectList: true,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.class',
        );
      });

      it('should reject recalculateFormulas call with non-static method', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<SObject>',
              isSObjectList: true,
              isNull: false,
            },
          ],
          isStatic: false,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.not.static',
        );
      });

      it('should reject recalculateFormulas call with wrong parameter type', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'String',
              isSObjectList: false,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.parameter.type',
        );
      });

      it('should reject recalculateFormulas call with null parameter', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<SObject>',
              isSObjectList: true,
              isNull: true,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.null.parameter',
        );
      });

      it('should reject recalculateFormulas call with no parameters', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.parameter.count',
        );
      });

      it('should reject recalculateFormulas call with too many parameters', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<SObject>',
              isSObjectList: true,
              isNull: false,
            },
            {
              type: 'String',
              isSObjectList: false,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.parameter.count',
        );
      });

      it('should reject recalculateFormulas call with non-SObject list parameter', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<String>',
              isSObjectList: false,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.parameter.type',
        );
      });

      it('should reject recalculateFormulas call with single SObject parameter', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'SObject',
              isSObjectList: false,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.parameter.type',
        );
      });
    });

    describe('edge cases', () => {
      it('should handle recalculateFormulas call with empty list parameter', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<SObject>',
              isSObjectList: true,
              isNull: false,
              isEmpty: true,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle recalculateFormulas call with generic SObject list', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<Object>',
              isSObjectList: false,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.parameter.type',
        );
      });
    });

    describe('error messages', () => {
      it('should return correct error message for wrong method name', () => {
        const callInfo = {
          methodName: 'calculate',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<SObject>',
              isSObjectList: true,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.method',
        );
      });

      it('should return correct error message for wrong class name', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.String',
          parameters: [
            {
              type: 'List<SObject>',
              isSObjectList: true,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.class',
        );
      });

      it('should return correct error message for non-static method', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<SObject>',
              isSObjectList: true,
              isNull: false,
            },
          ],
          isStatic: false,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.not.static',
        );
      });

      it('should return correct error message for wrong parameter type', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'Integer',
              isSObjectList: false,
              isNull: false,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.parameter.type',
        );
      });

      it('should return correct error message for null parameter', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [
            {
              type: 'List<SObject>',
              isSObjectList: true,
              isNull: true,
            },
          ],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.null.parameter',
        );
      });

      it('should return correct error message for wrong parameter count', () => {
        const callInfo = {
          methodName: 'recalculateFormulas',
          className: 'System.Formula',
          parameters: [],
          isStatic: true,
          isGlobal: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateRecalculateFormulasCall(
            callInfo,
            scope,
          );

        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.parameter.count',
        );
      });
    });
  });

  describe('validateFormulaRecalcResult', () => {
    describe('valid cases', () => {
      it('should validate valid FormulaRecalcResult type', () => {
        const resultInfo = {
          type: 'System.FormulaRecalcResult',
          isFormulaRecalcResult: true,
          isNull: false,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateFormulaRecalcResult(
            resultInfo,
            scope,
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate List<FormulaRecalcResult> type', () => {
        const resultInfo = {
          type: 'List<System.FormulaRecalcResult>',
          isFormulaRecalcResult: true,
          isNull: false,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateFormulaRecalcResult(
            resultInfo,
            scope,
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid cases', () => {
      it('should reject non-FormulaRecalcResult type', () => {
        const resultInfo = {
          type: 'String',
          isFormulaRecalcResult: false,
          isNull: false,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateFormulaRecalcResult(
            resultInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.return.type',
        );
      });

      it('should reject null FormulaRecalcResult', () => {
        const resultInfo = {
          type: 'System.FormulaRecalcResult',
          isFormulaRecalcResult: true,
          isNull: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateFormulaRecalcResult(
            resultInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.null.result',
        );
      });
    });
  });

  describe('validateFormulaRecalcFieldError', () => {
    describe('valid cases', () => {
      it('should validate valid FormulaRecalcFieldError type', () => {
        const errorInfo = {
          type: 'System.FormulaRecalcFieldError',
          isFormulaRecalcFieldError: true,
          isNull: false,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateFormulaRecalcFieldError(
            errorInfo,
            scope,
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate List<FormulaRecalcFieldError> type', () => {
        const errorInfo = {
          type: 'List<System.FormulaRecalcFieldError>',
          isFormulaRecalcFieldError: true,
          isNull: false,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateFormulaRecalcFieldError(
            errorInfo,
            scope,
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid cases', () => {
      it('should reject non-FormulaRecalcFieldError type', () => {
        const errorInfo = {
          type: 'String',
          isFormulaRecalcFieldError: false,
          isNull: false,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateFormulaRecalcFieldError(
            errorInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.wrong.error.type',
        );
      });

      it('should reject null FormulaRecalcFieldError', () => {
        const errorInfo = {
          type: 'System.FormulaRecalcFieldError',
          isFormulaRecalcFieldError: true,
          isNull: true,
        };

        const result =
          SObjectRecalculateFormulasValidator.validateFormulaRecalcFieldError(
            errorInfo,
            scope,
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.recalculate.formulas.null.error',
        );
      });
    });
  });
});
