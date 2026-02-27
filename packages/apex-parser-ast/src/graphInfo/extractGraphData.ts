/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { ApexSymbolGraph, ReferenceType } from '../symbols/ApexSymbolGraph';
import {
  GraphNode,
  GraphEdge,
  GraphData,
  FileGraphData,
  TypeGraphData,
} from '../types/graph';
import { ApexSymbol, SymbolTable } from '../types/symbol';
import {
  parseSymbolId,
  extractFilePathFromUri,
} from '../types/UriBasedIdGenerator';

/**
 * Helper function to get the graph instance via singleton
 */
function getGraph(): ApexSymbolGraph {
  return ApexSymbolGraph.getInstance();
}

/**
 * Extract all graph nodes as JSON-serializable data (synchronous version)
 * For better performance with large graphs, use getAllNodesEffect() instead
 */
export function getAllNodes(): GraphNode[] {
  return Effect.runSync(getAllNodesEffect());
}

/**
 * Extract all graph nodes as JSON-serializable data (Effect-based with yielding)
 * This version yields periodically to prevent blocking and can be queued as Background task
 */
export function getAllNodesEffect(): Effect.Effect<GraphNode[], never, never> {
  return Effect.gen(function* () {
    const graph = getGraph();
    const nodes: GraphNode[] = [];
    // Deduplicate by symbol.id since multiple symbolIds can resolve to the same symbol.id
    const seenNodeIds = new Map<string, GraphNode>();
    // Also track by name+kind+fileUri+location to catch duplicates with different IDs
    const seenByKey = new Map<string, GraphNode>();

    const symbolIds = graph.getSymbolIds();
    const symbolToVertex = graph.getSymbolToVertex();
    const fileToSymbolTable = graph.getFileToSymbolTable();
    const logger = graph.getLoggerInstance();

    // Diagnostic tracking
    const totalSymbolIds = symbolIds.size;
    let successfulRetrievals = 0;
    let failedRetrievals = 0;
    const failedUris = new Set<string>();
    const userFileUris = new Set<string>();
    const apexLibUris = new Set<string>();

    const symbolIdsArray = Array.from(symbolIds);
    const batchSize = 100;

    // Iterate through all symbol IDs with yielding
    for (let i = 0; i < symbolIdsArray.length; i++) {
      const symbolId = symbolIdsArray[i];

      // Track URI types for diagnostics
      try {
        const parsed = parseSymbolId(symbolId);
        if (parsed.uri.startsWith('file://')) {
          userFileUris.add(parsed.uri);
        } else if (parsed.uri.startsWith('apexlib://')) {
          apexLibUris.add(parsed.uri);
        }
      } catch (_e) {
        // Ignore parse errors for diagnostics
      }

      const symbol = graph.getSymbol(symbolId);
      if (symbol) {
        successfulRetrievals++;
        // Include all symbols including blocks - embrace the structural nature of SymbolTable
        // Blocks represent scopes and are part of the hierarchy
        // Deduplicate by symbol.id (not symbolId) since getSymbol() finds by name
        // Multiple symbolIds can resolve to the same symbol.id
        if (seenNodeIds.has(symbol.id)) {
          continue;
        }

        // Also deduplicate by semantic key (name+kind+fileUri+location) to catch duplicates with different IDs
        // This catches cases like duplicate class symbols with IDs like ...:class:Foo vs ...:class:Foo:class:Foo
        const semanticKey = `${symbol.name}|${symbol.kind}|${symbol.fileUri}|${
          symbol.location.identifierRange.startLine
        }:${symbol.location.identifierRange.startColumn}`;
        const existingByKey = seenByKey.get(semanticKey);
        if (existingByKey) {
          // Prefer the simpler/shorter ID (usually the correct one)
          if (symbol.id.length < existingByKey.id.length) {
            // Replace with shorter ID
            const index = nodes.findIndex((n) => n.id === existingByKey.id);
            if (index >= 0) {
              nodes.splice(index, 1);
            }
            seenNodeIds.delete(existingByKey.id);
          } else {
            // Skip this duplicate
            continue;
          }
        }

        // Get graph-specific properties from ReferenceNode
        const vertex = symbolToVertex.get(symbol.id);
        const nodeId = vertex?.value?.nodeId || 0;
        const referenceCount = vertex?.value?.referenceCount || 0;

        // Create proper GraphNode structure
        const graphNode: GraphNode = {
          id: symbol.id,
          name: symbol.name,
          kind: symbol.kind,
          fileUri: symbol.fileUri,
          fqn: symbol.fqn,
          location: symbol.location,
          modifiers: symbol.modifiers,
          parentId: symbol.parentId,
          namespace:
            typeof symbol.namespace === 'string'
              ? symbol.namespace
              : symbol.namespace?.toString() || null,
          annotations: symbol.annotations?.map((ann) => ({
            name: ann.name,
            parameters: ann.parameters?.map((param) => ({
              name: param.name || '',
              value: param.value,
            })),
          })),
          nodeId: nodeId,
          referenceCount: referenceCount,
        };

        seenNodeIds.set(symbol.id, graphNode);
        seenByKey.set(semanticKey, graphNode);
        nodes.push(graphNode);
      } else {
        failedRetrievals++;
        try {
          const parsed = parseSymbolId(symbolId);
          failedUris.add(parsed.uri);
        } catch (_e) {
          // Ignore parse errors
        }
      }

      // Yield every batchSize symbols to allow other tasks to run
      if ((i + 1) % batchSize === 0) {
        yield* Effect.yieldNow();
      }
    }

    // Log diagnostic information
    logger.debug(
      () =>
        `[getAllNodes] Total symbolIds: ${totalSymbolIds}, ` +
        `Successful retrievals: ${successfulRetrievals}, ` +
        `Failed retrievals: ${failedRetrievals}, ` +
        `Unique nodes: ${nodes.length}`,
    );
    logger.debug(
      () =>
        `[getAllNodes] User file URIs in symbolIds: ${userFileUris.size}, ` +
        `ApexLib URIs in symbolIds: ${apexLibUris.size}, ` +
        `Registered SymbolTables: ${fileToSymbolTable.size}`,
    );
    if (failedUris.size > 0) {
      logger.warn(
        () =>
          `[getAllNodes] Failed SymbolTable lookups for ${failedUris.size} URIs. ` +
          `Sample failed URIs: ${Array.from(failedUris).slice(0, 5).join(', ')}`,
      );
    }

    return nodes;
  });
}

/**
 * Add hierarchical edges from SymbolTable structure
 */
function addHierarchicalEdges(
  symbolTable: SymbolTable,
  fileUri: string,
  edges: GraphEdge[],
): void {
  // Get all symbols from the SymbolTable
  const allSymbols = symbolTable.getAllSymbols();

  // Create hierarchical edges for ALL symbols (including blocks)
  // Embrace the structural nature - blocks are part of the hierarchy
  for (const symbol of allSymbols) {
    if (symbol.parentId) {
      const parent = allSymbols.find((s) => s.id === symbol.parentId);
      if (parent) {
        // Create a "contains" relationship from parent to child
        // Use IMPORT_REFERENCE (9) as the type for hierarchical "contains" relationships
        edges.push({
          id: `${parent.id}-${symbol.id}`,
          source: parent.id,
          target: symbol.id,
          type: ReferenceType.IMPORT_REFERENCE, // Used as "contains" relationship
          sourceFileUri: fileUri,
          targetFileUri: fileUri,
          context: {
            methodName: symbol.kind === 'method' ? symbol.name : undefined,
            isStatic: symbol.modifiers?.isStatic || false,
          },
        });
      }
    }
  }
}

/**
 * Extract all graph edges as JSON-serializable data (synchronous version)
 * For better performance with large graphs, use getAllEdgesEffect() instead
 */
export function getAllEdges(): GraphEdge[] {
  return Effect.runSync(getAllEdgesEffect());
}

/**
 * Extract all graph edges as JSON-serializable data (Effect-based with yielding)
 * This version yields periodically to prevent blocking and can be queued as Background task
 */
export function getAllEdgesEffect(): Effect.Effect<GraphEdge[], never, never> {
  return Effect.gen(function* () {
    const graph = getGraph();
    const edges: GraphEdge[] = [];

    const fileToSymbolTable = graph.getFileToSymbolTable();
    const symbolToVertex = graph.getSymbolToVertex();
    const referenceGraph = graph.getReferenceGraph();

    // First, add hierarchical relationships from SymbolTable structure
    const fileEntries = Array.from(fileToSymbolTable.entries());
    const fileBatchSize = 50;
    for (let i = 0; i < fileEntries.length; i++) {
      const [fileUri, symbolTable] = fileEntries[i];
      if (symbolTable) {
        addHierarchicalEdges(symbolTable, fileUri, edges);
      }

      // Yield after processing each batch of files
      if ((i + 1) % fileBatchSize === 0) {
        yield* Effect.yieldNow();
      }
    }

    // Track hierarchical edge keys to avoid duplicates with reference edges
    // Use a Map to track edge type so we can prefer hierarchical edges
    const edgeMap = new Map<string, GraphEdge>();
    for (const edge of edges) {
      const edgeKey = `${edge.source}-${edge.target}`;
      edgeMap.set(edgeKey, edge);
    }

    // Then, add reference relationships from the graph
    // Only add reference edges that don't conflict with hierarchical "contains" relationships
    const vertexEntries = Array.from(symbolToVertex.entries());
    const vertexBatchSize = 100;

    for (let i = 0; i < vertexEntries.length; i++) {
      const [_symbolId, vertex] = vertexEntries[i];
      if (!vertex) continue;

      // Get outgoing edges for this vertex
      const outgoingEdges = referenceGraph.outgoingEdgesOf(vertex.key);

      for (const edge of outgoingEdges) {
        if (!edge.value) continue;

        const edgeKey = `${edge.src}-${edge.dest}`;
        const existingEdge = edgeMap.get(edgeKey);

        // If a hierarchical "contains" edge already exists, prefer it over reference edges
        // Hierarchical edges use IMPORT_REFERENCE (9) for contains relationships
        // For outer-inner class relationships, "contains" is more semantically correct than "calls"
        if (
          existingEdge &&
          existingEdge.type === ReferenceType.IMPORT_REFERENCE
        ) {
          // Check if this is a class-to-class relationship that should be "contains"
          const sourceSymbol = graph.getSymbol(String(edge.src));
          const targetSymbol = graph.getSymbol(String(edge.dest));
          if (
            sourceSymbol &&
            targetSymbol &&
            (sourceSymbol.kind === 'class' ||
              sourceSymbol.kind === 'interface' ||
              sourceSymbol.kind === 'enum') &&
            (targetSymbol.kind === 'class' ||
              targetSymbol.kind === 'interface' ||
              targetSymbol.kind === 'enum') &&
            edge.value.type === ReferenceType.CONSTRUCTOR_CALL
          ) {
            // Skip CONSTRUCTOR_CALL edges between classes when "contains" edge exists
            // This represents outer-inner class relationship, not a constructor call
            continue;
          }
        }

        const newEdge: GraphEdge = {
          id: edgeKey,
          source: String(edge.src),
          target: String(edge.dest),
          type: edge.value.type,
          sourceFileUri: edge.value.sourceFileUri,
          targetFileUri: edge.value.targetFileUri,
          context: edge.value.context
            ? {
                methodName: edge.value.context.methodName,
                parameterIndex: edge.value.context.parameterIndex
                  ? Number(edge.value.context.parameterIndex)
                  : undefined,
                isStatic: edge.value.context.isStatic,
                namespace: edge.value.context.namespace,
              }
            : undefined,
        };

        // Skip if an edge with the same source-target and type already exists (prevents duplicates)
        if (existingEdge && existingEdge.type === newEdge.type) {
          continue;
        }

        // Only add reference edge if:
        // 1. No existing edge, OR
        // 2. Existing edge is not a hierarchical edge (type 9) and types differ
        // Never overwrite hierarchical "contains" edges with reference edges
        if (
          !existingEdge ||
          (existingEdge.type !== ReferenceType.IMPORT_REFERENCE &&
            existingEdge.type !== newEdge.type)
        ) {
          edgeMap.set(edgeKey, newEdge);
        }
      }

      // Yield after processing each batch of vertices
      if ((i + 1) % vertexBatchSize === 0) {
        yield* Effect.yieldNow();
      }
    }

    // Convert map back to array
    return Array.from(edgeMap.values());
  });
}

/**
 * Get complete graph data (nodes + edges) as JSON-serializable data (synchronous version)
 * For better performance with large graphs, use getGraphDataEffect() instead
 */
export function getGraphData(): GraphData {
  return Effect.runSync(getGraphDataEffect());
}

/**
 * Get complete graph data (nodes + edges) as JSON-serializable data (Effect-based)
 * This version can be queued as Background task for better performance
 */
export function getGraphDataEffect(): Effect.Effect<GraphData, never, never> {
  return Effect.gen(function* () {
    const graph = getGraph();
    const nodes = yield* getAllNodesEffect();
    const edges = yield* getAllEdgesEffect();
    const fileIndex = graph.getFileIndex();
    return {
      nodes,
      edges,
      metadata: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        totalFiles: fileIndex.size,
        lastUpdated: Date.now(),
      },
    };
  });
}

/**
 * Get graph data filtered by file as JSON-serializable data
 */
export function getGraphDataForFile(fileUri: string): FileGraphData {
  const graph = getGraph();
  const normalizedUri = extractFilePathFromUri(fileUri);
  const fileIndex = graph.getFileIndex();
  const symbolToVertex = graph.getSymbolToVertex();
  const referenceGraph = graph.getReferenceGraph();
  const fileSymbolIds = fileIndex.get(normalizedUri) || [];

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Parent property removed - no need to clean it
  const cleanSymbol = (symbol: ApexSymbol): GraphNode => {
    const cleaned = { ...symbol } as any;

    const vertex = symbolToVertex.get(symbol.id);
    if (vertex?.value) {
      cleaned.nodeId = vertex.value.nodeId;
      cleaned.referenceCount = vertex.value.referenceCount;
    }

    return cleaned;
  };

  // Get nodes for this file
  for (const symbolId of fileSymbolIds) {
    const symbol = graph.getSymbol(symbolId);
    if (symbol) {
      // Include all symbols including blocks - embrace the structural nature of SymbolTable
      nodes.push(cleanSymbol(symbol));
    }
  }

  // 1. Add hierarchical "contains" edges from SymbolTable (same as getAllEdgesEffect)
  const symbolTable = graph.getSymbolTableForFile(normalizedUri);
  if (symbolTable) {
    addHierarchicalEdges(symbolTable, normalizedUri, edges);
  }

  // 2. Add reference edges, deduplicating by source-target-type
  const edgeMap = new Map<string, GraphEdge>();
  for (const e of edges) {
    edgeMap.set(`${e.source}-${e.target}-${String(e.type)}`, e);
  }

  const fileSymbolIdSet = new Set(fileSymbolIds);
  for (const symbolId of fileSymbolIds) {
    const vertex = symbolToVertex.get(symbolId);
    if (!vertex) continue;

    const outgoingEdges = referenceGraph.outgoingEdgesOf(vertex.key);
    for (const edge of outgoingEdges) {
      if (!edge.value) continue;
      const src = String(edge.src);
      const dest = String(edge.dest);
      // Only include if both endpoints are in this file
      if (!fileSymbolIdSet.has(src) || !fileSymbolIdSet.has(dest)) continue;

      const edgeKey = `${src}-${dest}-${String(edge.value.type)}`;
      if (edgeMap.has(edgeKey)) continue;

      edgeMap.set(edgeKey, {
        id: `${src}-${dest}`,
        source: src,
        target: dest,
        type: edge.value.type,
        sourceFileUri: edge.value.sourceFileUri,
        targetFileUri: edge.value.targetFileUri,
        context: edge.value.context
          ? {
              methodName: edge.value.context.methodName,
              parameterIndex: edge.value.context.parameterIndex
                ? Number(edge.value.context.parameterIndex)
                : undefined,
              isStatic: edge.value.context.isStatic,
              namespace: edge.value.context.namespace,
            }
          : undefined,
      });
    }
  }

  const finalEdges = Array.from(edgeMap.values());
  return {
    nodes,
    edges: finalEdges,
    fileUri,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: finalEdges.length,
      totalFiles: 1,
      lastUpdated: Date.now(),
    },
  };
}

/**
 * Get graph data filtered by symbol type as JSON-serializable data
 */
export function getGraphDataByType(symbolType: string): TypeGraphData {
  const graph = getGraph();
  const filteredNodes: GraphNode[] = [];
  const nodeIds = new Set<string>();

  const symbolIds = graph.getSymbolIds();
  const symbolToVertex = graph.getSymbolToVertex();
  const referenceGraph = graph.getReferenceGraph();
  const fileIndex = graph.getFileIndex();

  // Parent property removed - no need to clean it
  const cleanSymbol = (symbol: ApexSymbol): GraphNode => {
    const cleaned = { ...symbol } as any;

    const vertex = symbolToVertex.get(symbol.id);
    if (vertex?.value) {
      cleaned.nodeId = vertex.value.nodeId;
      cleaned.referenceCount = vertex.value.referenceCount;
    }

    return cleaned;
  };

  // Get all nodes of the specified type
  for (const symbolId of symbolIds) {
    const symbol = graph.getSymbol(symbolId);
    if (symbol && symbol.kind === symbolType) {
      // Include all symbols including blocks - embrace the structural nature of SymbolTable
      filteredNodes.push(cleanSymbol(symbol));
      nodeIds.add(symbolId);
    }
  }

  const edges: GraphEdge[] = [];

  // Get edges that involve the filtered nodes
  for (const symbolId of nodeIds) {
    const vertex = symbolToVertex.get(symbolId);
    if (!vertex) continue;

    const outgoingEdges = referenceGraph.outgoingEdgesOf(vertex.key);
    const incomingEdges = referenceGraph.incomingEdgesOf(vertex.key);

    for (const edge of [...outgoingEdges, ...incomingEdges]) {
      if (!edge.value) continue;
      edges.push({
        id: `${edge.src}-${edge.dest}`,
        source: String(edge.src),
        target: String(edge.dest),
        type: edge.value.type,
        sourceFileUri: edge.value.sourceFileUri,
        targetFileUri: edge.value.targetFileUri,
        context: edge.value.context
          ? {
              methodName: edge.value.context.methodName,
              parameterIndex: edge.value.context.parameterIndex
                ? Number(edge.value.context.parameterIndex)
                : undefined,
              isStatic: edge.value.context.isStatic,
              namespace: edge.value.context.namespace,
            }
          : undefined,
      });
    }
  }

  return {
    nodes: filteredNodes,
    edges,
    symbolType,
    metadata: {
      totalNodes: filteredNodes.length,
      totalEdges: edges.length,
      totalFiles: fileIndex.size,
      lastUpdated: Date.now(),
    },
  };
}

/**
 * Get graph data as a JSON string (for direct wire transmission)
 */
export function getGraphDataAsJSON(): string {
  return JSON.stringify(getGraphData());
}

/**
 * Get graph data for a file as a JSON string
 */
export function getGraphDataForFileAsJSON(fileUri: string): string {
  return JSON.stringify(getGraphDataForFile(fileUri));
}

/**
 * Get graph data by type as a JSON string
 */
export function getGraphDataByTypeAsJSON(symbolType: string): string {
  return JSON.stringify(getGraphDataByType(symbolType));
}
