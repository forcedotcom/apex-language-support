/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Diagnostic } from 'vscode-languageserver';
import type { GraphData, GraphNode } from '@salesforce/apex-lsp-parser-ast';
import type {
  DiagnosticAnalysis,
  AnalysisEvidence,
} from '../types/diagnosticGraph';

const NEW_NAME_CONFLICT_INNER = 'new.name.conflict.inner';
const DUPLICATE_TYPE_NAME = 'duplicate.type.name';
const CONSTRUCTOR_NO_PARENT = 'CONSTRUCTOR_NO_PARENT';

/**
 * Service for analyzing diagnostics to detect and explain false positives.
 */
export class DiagnosticAnalysisService {
  /**
   * Analyze a diagnostic for false positive patterns.
   */
  analyzeFalsePositive(
    diagnostic: Diagnostic,
    graphData: GraphData,
  ): DiagnosticAnalysis | null {
    const code = typeof diagnostic.code === 'string' ? diagnostic.code : null;
    if (!code) return null;

    switch (code) {
      case NEW_NAME_CONFLICT_INNER:
        return this.analyzeNewExpressionConflict(diagnostic, graphData);
      case DUPLICATE_TYPE_NAME:
        return this.analyzeDuplicateTypeName(diagnostic, graphData);
      case CONSTRUCTOR_NO_PARENT:
        return this.analyzeConstructorNoParent(diagnostic, graphData);
      default:
        return null;
    }
  }

  /**
   * Analyze new.name.conflict.inner - validator claims 'new FooB()' conflicts with inner type FooB.
   */
  analyzeNewExpressionConflict(
    diagnostic: Diagnostic,
    graphData: GraphData,
  ): DiagnosticAnalysis {
    const diagLine = diagnostic.range ? diagnostic.range.start.line + 1 : 0;
    const evidence: AnalysisEvidence[] = [];

    // Find the inner type (FooB) and outer type (Foo) in the graph
    const allTypes = graphData.nodes.filter(
      (n) => n.kind === 'class' || n.kind === 'interface' || n.kind === 'enum',
    );

    // Find types at or near the diagnostic line
    const typesAtLine = allTypes.filter((t) => {
      const start =
        t.location?.identifierRange?.startLine ??
        t.location?.symbolRange?.startLine;
      return start === diagLine;
    });

    // Find inner types (have parentId)
    const innerTypes = allTypes.filter((t) => t.parentId != null);
    const typesWithSameName = new Map<string, GraphNode[]>();
    for (const t of innerTypes) {
      const key = t.name.toLowerCase();
      if (!typesWithSameName.has(key)) {
        typesWithSameName.set(key, []);
      }
      typesWithSameName.get(key)!.push(t);
    }

    // Check: if constructor call targets the ONLY inner type with that name, it's valid (false positive)
    let isFalsePositive = false;
    let reason = 'Unable to determine from graph structure.';

    for (const type of typesAtLine) {
      const sameName = typesWithSameName.get(type.name.toLowerCase()) ?? [];
      const inSameFile = sameName.filter((t) => t.fileUri === type.fileUri);

      if (inSameFile.length === 1) {
        const inner = inSameFile[0];
        if (inner.id === type.id) {
          isFalsePositive = true;
          reason =
            `The constructor call 'new ${type.name}()' correctly instantiates the inner class ${type.name}. ` +
            'The validator may have incorrectly treated the field declaration type and the inner class as conflicting.';
          evidence.push({
            type: 'node',
            description: `Inner type ${type.name} at line ${inner.location?.identifierRange?.startLine ?? '?'}`,
            nodeId: inner.id,
          });
          const parent = graphData.nodes.find((n) => n.id === inner.parentId);
          if (parent) {
            evidence.push({
              type: 'relationship',
              description: `Parent class ${parent.name} contains inner class ${inner.name}`,
              nodeId: parent.id,
            });
          }
        }
      }
    }

    if (!isFalsePositive && evidence.length === 0) {
      reason =
        'Analyze graph: check if the inner type and constructor target are the same symbol.';
    }

    return {
      isFalsePositive,
      reason,
      evidence,
      suggestions: isFalsePositive
        ? [
            'Consider suppressing this validator for inner class constructors in same scope.',
          ]
        : undefined,
    };
  }

  /**
   * Analyze duplicate.type.name - validator claims type name is already in use.
   */
  analyzeDuplicateTypeName(
    diagnostic: Diagnostic,
    graphData: GraphData,
  ): DiagnosticAnalysis {
    const diagLine = diagnostic.range ? diagnostic.range.start.line + 1 : 0;
    const evidence: AnalysisEvidence[] = [];

    const allTypes = graphData.nodes.filter(
      (n) => n.kind === 'class' || n.kind === 'interface' || n.kind === 'enum',
    );

    const typesAtLine = allTypes.filter((t) => {
      const start =
        t.location?.identifierRange?.startLine ??
        t.location?.symbolRange?.startLine;
      return start === diagLine;
    });

    // Group by parentId and name
    const byParentAndName = new Map<string, GraphNode[]>();
    for (const t of allTypes) {
      const parentKey = t.parentId ?? 'root';
      const nameKey = t.name.toLowerCase();
      const key = `${parentKey}:${nameKey}`;
      if (!byParentAndName.has(key)) {
        byParentAndName.set(key, []);
      }
      byParentAndName.get(key)!.push(t);
    }

    let isFalsePositive = false;
    let reason = 'Unable to determine from graph structure.';

    for (const type of typesAtLine) {
      const parentKey = type.parentId ?? 'root';
      const nameKey = type.name.toLowerCase();
      const key = `${parentKey}:${nameKey}`;
      const duplicates = byParentAndName.get(key) ?? [];

      if (duplicates.length === 1) {
        isFalsePositive = true;
        reason =
          `Only one type named '${type.name}' exists in this scope (parentId: ${type.parentId ?? 'root'}). ` +
          'The validator may incorrectly report duplicates when the same class is added by different listeners.';
        evidence.push({
          type: 'node',
          description: `Type ${type.name} in scope`,
          nodeId: type.id,
        });
      } else if (duplicates.length > 1) {
        const uniqueIds = new Set(duplicates.map((d) => d.id));
        if (uniqueIds.size === 1) {
          isFalsePositive = true;
          reason =
            `Graph shows a single type '${type.name}' (same ID repeated). ` +
            'Likely a listener/collector duplicate, not a real duplicate declaration.';
        }
      }
    }

    return {
      isFalsePositive,
      reason,
      evidence,
      suggestions: isFalsePositive
        ? ['Check if SymbolTable is deduplicating inner classes correctly.']
        : undefined,
    };
  }

  /**
   * Analyze CONSTRUCTOR_NO_PARENT - constructor found without a parent class.
   */
  analyzeConstructorNoParent(
    diagnostic: Diagnostic,
    graphData: GraphData,
  ): DiagnosticAnalysis {
    const diagLine = diagnostic.range ? diagnostic.range.start.line + 1 : 0;
    const evidence: AnalysisEvidence[] = [];

    const constructors = graphData.nodes.filter(
      (n) => n.kind === 'constructor',
    );
    const types = graphData.nodes.filter(
      (n) => n.kind === 'class' || n.kind === 'interface',
    );

    const constructorAtLine = constructors.find((c) => {
      const start =
        c.location?.identifierRange?.startLine ??
        c.location?.symbolRange?.startLine;
      return start === diagLine;
    });

    let isFalsePositive = false;
    let reason = 'Unable to determine from graph structure.';

    if (constructorAtLine) {
      const parentId = constructorAtLine.parentId;
      const parent = graphData.nodes.find((n) => n.id === parentId);

      if (parent) {
        isFalsePositive = true;
        reason =
          `Constructor '${constructorAtLine.name}' has parentId ${parentId} ` +
          `pointing to ${parent.kind} '${parent.name}'. ` +
          "The validator looks for kind='class' but the parent may be stored " +
          'differently (e.g., BlockSymbol).';
        evidence.push({
          type: 'node',
          description: `Constructor ${constructorAtLine.name}`,
          nodeId: constructorAtLine.id,
        });
        evidence.push({
          type: 'relationship',
          description: `Parent: ${parent.kind} ${parent.name}`,
          nodeId: parent.id,
        });
      } else {
        const matchingClass = types.find(
          (t) =>
            t.name.toLowerCase() === constructorAtLine.name.toLowerCase() &&
            t.fileUri === constructorAtLine.fileUri,
        );
        if (matchingClass) {
          isFalsePositive = true;
          reason =
            `Constructor '${constructorAtLine.name}' matches class '${matchingClass.name}' in same file. ` +
            'Parent link may be missing or constructor may have wrong parentId.';
          evidence.push({
            type: 'node',
            description: `Matching class ${matchingClass.name}`,
            nodeId: matchingClass.id,
          });
        }
      }
    }

    return {
      isFalsePositive,
      reason,
      evidence,
      suggestions: isFalsePositive
        ? [
            'Ensure constructor parentId points to Class symbol, not BlockSymbol.',
          ]
        : undefined,
    };
  }
}
