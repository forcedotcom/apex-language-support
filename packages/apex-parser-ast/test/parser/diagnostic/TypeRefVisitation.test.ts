/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CharStreams, CommonTokenStream, ParserRuleContext } from 'antlr4ts';
import {
  ApexLexer,
  ApexParser,
  ParseTreeWalker,
  TypeRefContext,
  LocalVariableDeclarationContext,
} from '@apexdevtools/apex-parser';

/**
 * Diagnostic listener that tracks all rule visits to understand parse tree structure
 * and verify if enterTypeRef is being called by the ANTLR ParseTreeWalker
 *
 * Uses a partial implementation approach - only implements the methods we care about
 * for diagnostic purposes. The ParseTreeWalker will call these methods via reflection.
 */
class DiagnosticListener {
  visitedRules: Array<{
    rule: string;
    parent: string;
    line: number;
    column: number;
  }> = [];

  enterTypeRefCalled: Array<{
    line: number;
    column: number;
    parent: string;
  }> = [];

  enterLocalVariableDeclarationCalled: Array<{
    line: number;
    column: number;
    typeRefExists: boolean;
    typeRefType?: string;
  }> = [];

  enterEveryRule(ctx: ParserRuleContext): void {
    const ruleName = ctx.constructor.name;
    const parentName = ctx.parent?.constructor.name || 'null';
    this.visitedRules.push({
      rule: ruleName,
      parent: parentName,
      line: ctx.start?.line || 0,
      column: ctx.start?.charPositionInLine || 0,
    });
  }

  exitEveryRule(_ctx: ParserRuleContext): void {
    // No-op for diagnostic purposes
  }

  visitTerminal(): void {
    // No-op for diagnostic purposes
  }

  visitErrorNode(): void {
    // No-op for diagnostic purposes
  }

  enterTypeRef(ctx: TypeRefContext): void {
    const parentName = ctx.parent?.constructor.name || 'null';
    this.enterTypeRefCalled.push({
      line: ctx.start?.line || 0,
      column: ctx.start?.charPositionInLine || 0,
      parent: parentName,
    });
    console.log(
      `[DIAGNOSTIC] enterTypeRef called at line ${ctx.start?.line}:` +
        `${ctx.start?.charPositionInLine}, parent=${parentName}`,
    );
  }

  exitTypeRef(): void {
    // No-op for diagnostic purposes
  }

  enterLocalVariableDeclaration(ctx: LocalVariableDeclarationContext): void {
    const typeRef = ctx.typeRef();
    const typeRefExists = !!typeRef;
    const typeRefType = typeRef?.constructor.name;
    this.enterLocalVariableDeclarationCalled.push({
      line: ctx.start?.line || 0,
      column: ctx.start?.charPositionInLine || 0,
      typeRefExists,
      typeRefType,
    });
    console.log(
      `[DIAGNOSTIC] enterLocalVariableDeclaration called at line ${ctx.start?.line}:${ctx.start?.charPositionInLine}`,
    );
    console.log(
      `[DIAGNOSTIC] typeRef exists: ${typeRefExists}, typeRef type: ${typeRefType}`,
    );
  }

  exitLocalVariableDeclaration(): void {
    // No-op for diagnostic purposes
  }
}

describe('TypeRef Visitation Diagnostic', () => {
  const parseAndWalk = (code: string): DiagnosticListener => {
    const inputStream = CharStreams.fromString(code);
    const lexer = new ApexLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new ApexParser(tokenStream);
    const walker = new ParseTreeWalker();

    const diagnosticListener = new DiagnosticListener();
    walker.walk(diagnosticListener, parser.compilationUnit());
    return diagnosticListener;
  };

  describe('LHS typeRef in localVariableDeclaration', () => {
    it('should verify enterTypeRef is called for LHS typeRef in List<Foo> x = new List<Foo>()', () => {
      const code = `
public class TestClass {
    public void myMethod() {
        List<DualListboxValueVModel> x = new List<DualListboxValueVModel>();
    }
}`;

      const listener = parseAndWalk(code);

      // Analyze all TypeRefContext visits
      const typeRefVisits = listener.visitedRules.filter(
        (r) => r.rule === 'TypeRefContext',
      );

      console.log(
        `[DIAGNOSTIC] Total TypeRefContext visits: ${typeRefVisits.length}`,
      );
      typeRefVisits.forEach((visit, idx) => {
        console.log(
          `[DIAGNOSTIC] TypeRefContext visit ${idx + 1}: line ${visit.line}:${visit.column}, parent=${visit.parent}`,
        );
      });

      // Check for TypeRefContext with LocalVariableDeclarationContext parent
      const localVarTypeRefs = typeRefVisits.filter(
        (r) => r.parent === 'LocalVariableDeclarationContext',
      );

      console.log(
        `[DIAGNOSTIC] TypeRefContext visits with LocalVariableDeclarationContext parent: ${localVarTypeRefs.length}`,
      );

      // Check if enterTypeRef was called
      console.log(
        `[DIAGNOSTIC] enterTypeRef called ${listener.enterTypeRefCalled.length} times`,
      );
      listener.enterTypeRefCalled.forEach((call, idx) => {
        console.log(
          `[DIAGNOSTIC] enterTypeRef call ${idx + 1}: line ${call.line}:${call.column}, parent=${call.parent}`,
        );
      });

      // Check if enterLocalVariableDeclaration was called
      console.log(
        '[DIAGNOSTIC] enterLocalVariableDeclaration called ' +
          `${listener.enterLocalVariableDeclarationCalled.length} times`,
      );
      listener.enterLocalVariableDeclarationCalled.forEach((call, idx) => {
        console.log(
          `[DIAGNOSTIC] enterLocalVariableDeclaration call ${idx + 1}: ` +
            `line ${call.line}:${call.column}, typeRefExists=${call.typeRefExists}, ` +
            `typeRefType=${call.typeRefType}`,
        );
      });

      // Assertions
      expect(
        listener.enterLocalVariableDeclarationCalled.length,
      ).toBeGreaterThan(0);
      expect(localVarTypeRefs.length).toBeGreaterThan(0);

      // Key assertion: verify enterTypeRef was called for the LHS typeRef
      const lhsTypeRefCall = listener.enterTypeRefCalled.find(
        (call) => call.parent === 'LocalVariableDeclarationContext',
      );

      if (lhsTypeRefCall) {
        console.log(
          '[DIAGNOSTIC] ✓ enterTypeRef WAS called for LHS typeRef with LocalVariableDeclarationContext parent',
        );
        expect(lhsTypeRefCall).toBeDefined();
      } else {
        console.log(
          '[DIAGNOSTIC] ✗ enterTypeRef was NOT called for LHS typeRef with LocalVariableDeclarationContext parent',
        );
        console.log(
          '[DIAGNOSTIC] This indicates a method signature mismatch or walker issue',
        );
        // This test will fail, which is intentional to surface the issue
        expect(lhsTypeRefCall).toBeDefined();
      }
    });

    it('should verify parse tree structure for simple type declaration', () => {
      const code = `
public class TestClass {
    public void myMethod() {
        String x = "test";
    }
}`;

      const listener = parseAndWalk(code);

      // Find TypeRefContext visits
      const typeRefVisits = listener.visitedRules.filter(
        (r) => r.rule === 'TypeRefContext',
      );

      const localVarTypeRefs = typeRefVisits.filter(
        (r) => r.parent === 'LocalVariableDeclarationContext',
      );

      console.log(
        '[DIAGNOSTIC] Simple type: TypeRefContext visits with ' +
          `LocalVariableDeclarationContext parent: ${localVarTypeRefs.length}`,
      );

      const lhsTypeRefCall = listener.enterTypeRefCalled.find(
        (call) => call.parent === 'LocalVariableDeclarationContext',
      );

      console.log(
        `[DIAGNOSTIC] Simple type: enterTypeRef called for LocalVariableDeclarationContext: ${!!lhsTypeRefCall}`,
      );

      // For simple types, enterTypeRef should also be called
      expect(localVarTypeRefs.length).toBeGreaterThan(0);
      expect(lhsTypeRefCall).toBeDefined();
    });

    it('should verify parse tree structure for generic type in constructor call', () => {
      const code = `
public class TestClass {
    public void myMethod() {
        List<String> x = new List<String>();
    }
}`;

      const listener = parseAndWalk(code);

      // Find all TypeRefContext visits
      const typeRefVisits = listener.visitedRules.filter(
        (r) => r.rule === 'TypeRefContext',
      );

      console.log(
        `[DIAGNOSTIC] Generic constructor: Total TypeRefContext visits: ${typeRefVisits.length}`,
      );
      typeRefVisits.forEach((visit, idx) => {
        console.log(
          `[DIAGNOSTIC] Generic constructor: TypeRefContext visit ${idx + 1}: ` +
            `line ${visit.line}:${visit.column}, parent=${visit.parent}`,
        );
      });

      // Check for LHS (LocalVariableDeclarationContext)
      const lhsTypeRefs = typeRefVisits.filter(
        (r) => r.parent === 'LocalVariableDeclarationContext',
      );

      // Check for RHS (NewExpressionContext -> CreatorContext -> CreatedNameContext -> IdCreatedNamePairContext)
      const rhsTypeRefs = typeRefVisits.filter(
        (r) =>
          r.parent === 'TypeListContext' ||
          r.parent === 'TypeArgumentsContext' ||
          r.parent === 'IdCreatedNamePairContext',
      );

      console.log(
        `[DIAGNOSTIC] Generic constructor: LHS TypeRefContext visits: ${lhsTypeRefs.length}`,
      );
      console.log(
        `[DIAGNOSTIC] Generic constructor: RHS TypeRefContext visits: ${rhsTypeRefs.length}`,
      );

      // Verify enterTypeRef calls
      const lhsTypeRefCall = listener.enterTypeRefCalled.find(
        (call) => call.parent === 'LocalVariableDeclarationContext',
      );

      console.log(
        `[DIAGNOSTIC] Generic constructor: enterTypeRef called for LHS: ${!!lhsTypeRefCall}`,
      );

      expect(lhsTypeRefs.length).toBeGreaterThan(0);
      // The key assertion: enterTypeRef should be called for LHS
      expect(lhsTypeRefCall).toBeDefined();
    });
  });

  describe('Parse tree structure analysis', () => {
    it('should log complete parse tree structure for diagnostic purposes', () => {
      const code = `
public class TestClass {
    public void myMethod() {
        List<DualListboxValueVModel> x = new List<DualListboxValueVModel>();
    }
}`;

      const listener = parseAndWalk(code);

      // Group visits by rule type
      const ruleGroups: Record<string, number> = {};
      listener.visitedRules.forEach((visit) => {
        ruleGroups[visit.rule] = (ruleGroups[visit.rule] || 0) + 1;
      });

      console.log('[DIAGNOSTIC] Rule visit counts:');
      Object.entries(ruleGroups)
        .sort((a, b) => b[1] - a[1])
        .forEach(([rule, count]) => {
          console.log(`[DIAGNOSTIC]   ${rule}: ${count}`);
        });

      // Find all TypeRefContext visits with their full context
      const typeRefVisits = listener.visitedRules.filter(
        (r) => r.rule === 'TypeRefContext',
      );

      console.log(
        `[DIAGNOSTIC] Complete TypeRefContext visit details (${typeRefVisits.length} total):`,
      );
      typeRefVisits.forEach((visit, idx) => {
        console.log(
          `[DIAGNOSTIC]   ${idx + 1}. Line ${visit.line}:${visit.column}, Parent: ${visit.parent}`,
        );
      });

      // Verify we have TypeRefContext visits
      expect(typeRefVisits.length).toBeGreaterThan(0);
    });
  });
});
