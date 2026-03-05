/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Diagnostic } from 'vscode-languageserver';
import type {
  GraphData,
  GraphNode,
  GraphEdge,
} from '@salesforce/apex-lsp-parser-ast';
import type {
  DiagnosticGraphCorrelation,
  DiagnosticAnalysis,
} from '../types/diagnosticGraph';
import { DiagnosticAnalysisService } from './DiagnosticAnalysisService';

/**
 * Checks if a diagnostic range overlaps a node's location.
 * LSP uses 0-based line/character; parser uses 1-based line, 0-based column.
 */
function rangesOverlap(diagnostic: Diagnostic, node: GraphNode): boolean {
  if (!diagnostic.range || !node.location?.identifierRange) {
    return false;
  }

  const diagStartLine = diagnostic.range.start.line + 1; // LSP 0-based -> 1-based
  const diagStartCol = diagnostic.range.start.character;
  const diagEndLine = diagnostic.range.end.line + 1;
  const diagEndCol = diagnostic.range.end.character;

  const nodeStartLine = node.location.identifierRange.startLine ?? 0;
  const nodeStartCol = node.location.identifierRange.startColumn ?? 0;
  const nodeEndLine = node.location.identifierRange.endLine ?? 0;
  const nodeEndCol = node.location.identifierRange.endColumn ?? 0;

  // Check if ranges overlap
  if (diagEndLine < nodeStartLine || diagStartLine > nodeEndLine) {
    return false;
  }
  if (diagEndLine === nodeStartLine && diagEndCol < nodeStartCol) {
    return false;
  }
  if (diagStartLine === nodeEndLine && diagStartCol > nodeEndCol) {
    return false;
  }
  return true;
}

/**
 * Service for correlating diagnostics with symbol graph nodes and edges.
 */
export class DiagnosticGraphCorrelationService {
  private readonly analysisService: DiagnosticAnalysisService;

  constructor() {
    this.analysisService = new DiagnosticAnalysisService();
  }

  /**
   * Correlate diagnostics with graph nodes/edges by location matching.
   */
  correlateDiagnosticsWithGraph(
    diagnostics: Diagnostic[],
    graphData: GraphData,
    fileUri: string,
  ): DiagnosticGraphCorrelation[] {
    const correlations: DiagnosticGraphCorrelation[] = [];

    for (const diagnostic of diagnostics) {
      const relatedNodes = this.findRelatedNodes(
        diagnostic,
        graphData,
        fileUri,
      );
      const relatedEdges = this.findRelatedEdges(
        diagnostic,
        graphData,
        relatedNodes,
      );
      const analysis = this.analysisService.analyzeFalsePositive(
        diagnostic,
        graphData,
      );

      correlations.push({
        diagnostic,
        relatedNodeIds: relatedNodes.map((n) => n.id),
        relatedEdgeIds: relatedEdges.map((e) => e.id),
        analysis: analysis ?? undefined,
      });
    }

    return correlations;
  }

  /**
   * Find graph nodes whose locations overlap or relate to the diagnostic.
   */
  findRelatedNodes(
    diagnostic: Diagnostic,
    graphData: GraphData,
    fileUri: string,
  ): GraphNode[] {
    const related: GraphNode[] = [];

    for (const node of graphData.nodes) {
      if (node.fileUri !== fileUri) continue;
      if (rangesOverlap(diagnostic, node)) {
        related.push(node);
      }
    }

    // If no direct overlap, find nodes at same line
    if (related.length === 0 && diagnostic.range) {
      const diagLine = diagnostic.range.start.line + 1;
      for (const node of graphData.nodes) {
        if (node.fileUri !== fileUri) continue;
        const nodeLine =
          node.location?.identifierRange?.startLine ??
          node.location?.symbolRange?.startLine;
        if (nodeLine === diagLine) {
          related.push(node);
        }
      }
    }

    // Include parent nodes for context
    const expanded: GraphNode[] = [...related];
    const seenIds = new Set(related.map((n) => n.id));
    for (const node of related) {
      if (node.parentId) {
        const parent = graphData.nodes.find((n) => n.id === node.parentId);
        if (parent && !seenIds.has(parent.id)) {
          seenIds.add(parent.id);
          expanded.push(parent);
        }
      }
    }

    return expanded;
  }

  /**
   * Find graph edges that involve the related nodes.
   */
  findRelatedEdges(
    diagnostic: Diagnostic,
    graphData: GraphData,
    relatedNodes: GraphNode[],
  ): GraphEdge[] {
    const relatedIds = new Set(relatedNodes.map((n) => n.id));
    const edges: GraphEdge[] = [];

    for (const edge of graphData.edges) {
      if (relatedIds.has(edge.source) || relatedIds.has(edge.target)) {
        edges.push(edge);
      }
    }

    return edges;
  }

  /**
   * Analyze a diagnostic for false positive patterns.
   */
  analyzeFalsePositive(
    diagnostic: Diagnostic,
    graphData: GraphData,
  ): DiagnosticAnalysis | null {
    return this.analysisService.analyzeFalsePositive(diagnostic, graphData);
  }
}
