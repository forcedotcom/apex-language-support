/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as vscode from 'vscode';
import { logToOutputChannel } from './logging';
import {
  FindMissingArtifactParams,
  FindMissingArtifactResult,
} from '@salesforce/apex-lsp-shared';

export async function handleFindMissingArtifact(
  params: FindMissingArtifactParams,
  context: vscode.ExtensionContext,
): Promise<FindMissingArtifactResult> {
  logToOutputChannel(
    `🔍 Handling missing artifact request for: ${params.identifier}`,
    'debug',
  );

  try {
    // Try to resolve from workspace files only
    // StandardApexLibrary resolution is handled by lsp-compliant-services and parser-ast
    const workspaceResult = await resolveFromWorkspace(params);
    if (workspaceResult) {
      return workspaceResult;
    }

    // Not found in workspace
    logToOutputChannel(
      `❌ Could not find artifact in workspace: ${params.identifier}`,
      'debug',
    );
    return { notFound: true };
  } catch (error) {
    logToOutputChannel(
      `❌ Error resolving artifact ${params.identifier}: ${error}`,
      'error',
    );
    return { notFound: true };
  }
}

async function resolveFromWorkspace(
  params: FindMissingArtifactParams,
): Promise<FindMissingArtifactResult | null> {
  const identifier = params.identifier;
  const maxCandidates = params.maxCandidatesToOpen || 3;

  logToOutputChannel(`🔍 Resolving missing artifact: ${identifier}`, 'debug');

  // Use intelligent search strategy based on available information
  const searchStrategies = generateSearchStrategies(params);

  for (const strategy of searchStrategies) {
    logToOutputChannel(
      `🔍 Trying strategy: ${strategy.reasoning} (confidence: ${strategy.confidence})`,
      'debug',
    );

    const files = await searchWithStrategy(strategy, maxCandidates);

    if (files.length > 0) {
      logToOutputChannel(
        `✅ Found ${files.length} files using strategy: ${strategy.reasoning}`,
        'debug',
      );

      const openedFiles = await openFiles(files, params.mode);
      if (openedFiles.length > 0) {
        return { opened: openedFiles };
      }
    }
  }

  logToOutputChannel(
    `❌ Could not find artifact in workspace: ${identifier}`,
    'debug',
  );
  return null;
}

interface SearchStrategy {
  searchPatterns: string[];
  priority: 'exact' | 'high' | 'medium' | 'low';
  reasoning: string;
  expectedFileType: string;
  confidence: number;
  fallbackPatterns?: string[];
  namespace?: string;
}

function generateSearchStrategies(
  params: FindMissingArtifactParams,
): SearchStrategy[] {
  const strategies: SearchStrategy[] = [];
  const identifier = params.identifier;

  // Strategy 1: Use server-provided search hints (highest priority)
  if (params.searchHints && params.searchHints.length > 0) {
    for (const hint of params.searchHints) {
      strategies.push({
        searchPatterns: hint.searchPatterns || [
          `**/${hint.expectedFileType || 'class'}.cls`,
        ],
        priority: hint.priority || 'high',
        reasoning: hint.reasoning || 'Server-provided search hint',
        expectedFileType: hint.expectedFileType || 'class',
        confidence: hint.confidence || 0.8,
        fallbackPatterns: hint.fallbackPatterns,
        namespace: hint.namespace,
      });
    }
  }

  // Strategy 2: Use resolved qualifier information
  if (params.resolvedQualifier) {
    const qualifier = params.resolvedQualifier;
    strategies.push({
      searchPatterns: [`**/${qualifier.name}.cls`],
      priority: 'exact',
      reasoning: `Resolved qualifier: ${qualifier.type} ${qualifier.name}`,
      expectedFileType: 'class',
      confidence: 0.9,
      namespace: qualifier.namespace,
    });
  }

  // Strategy 3: Parse identifier intelligently
  if (identifier.includes('.')) {
    const [className, _theRest] = identifier.split('.', 2);
    strategies.push({
      searchPatterns: [`**/${className}.cls`],
      priority: 'high',
      reasoning: `Class.method reference: searching for class ${className}`,
      expectedFileType: 'class',
      confidence: 0.8,
    });
  } else {
    // Unqualified reference - could be class or method
    strategies.push({
      searchPatterns: [`**/${identifier}.cls`],
      priority: 'medium',
      reasoning: `Unqualified reference: searching for class ${identifier}`,
      expectedFileType: 'class',
      confidence: 0.6,
    });
  }

  // Strategy 4: Use type reference information
  if (params.typeReference) {
    const ref = params.typeReference;
    if (ref.qualifier) {
      strategies.push({
        searchPatterns: [`**/${ref.qualifier}.cls`],
        priority: 'exact',
        reasoning: `TypeReference qualifier: ${ref.qualifier}`,
        expectedFileType: 'class',
        confidence: 0.95,
      });
    }
  }

  // Strategy 5: Use parent context
  if (params.parentContext?.containingType) {
    const containingType = params.parentContext.containingType;
    if (containingType.name) {
      strategies.push({
        searchPatterns: [`**/${containingType.name}.cls`],
        priority: 'high',
        reasoning: `Parent context: ${containingType.name}`,
        expectedFileType: 'class',
        confidence: 0.7,
      });
    }
  }

  // Strategy 6: Fallback patterns
  strategies.push({
    searchPatterns: [`**/${identifier}*.cls`, `**/${identifier}*.trigger`],
    priority: 'low',
    reasoning: 'Fallback: broad pattern search',
    expectedFileType: 'class',
    confidence: 0.3,
  });

  // Sort by confidence (highest first)
  return strategies.sort((a, b) => b.confidence - a.confidence);
}

async function searchWithStrategy(
  strategy: SearchStrategy,
  maxCandidates: number,
): Promise<vscode.Uri[]> {
  const allFiles: vscode.Uri[] = [];

  // Try primary search patterns
  for (const pattern of strategy.searchPatterns) {
    try {
      const files = await vscode.workspace.findFiles(
        pattern,
        null,
        maxCandidates,
      );
      allFiles.push(...files);

      if (allFiles.length >= maxCandidates) {
        break;
      }
    } catch (error) {
      logToOutputChannel(
        `⚠️ Error searching with pattern ${pattern}: ${error}`,
        'debug',
      );
    }
  }

  // Try fallback patterns if we didn't find enough files
  if (allFiles.length < maxCandidates && strategy.fallbackPatterns) {
    for (const pattern of strategy.fallbackPatterns) {
      try {
        const files = await vscode.workspace.findFiles(
          pattern,
          null,
          maxCandidates - allFiles.length,
        );
        allFiles.push(...files);

        if (allFiles.length >= maxCandidates) {
          break;
        }
      } catch (error) {
        logToOutputChannel(
          `⚠️ Error searching with fallback pattern ${pattern}: ${error}`,
          'debug',
        );
      }
    }
  }

  // Remove duplicates and limit results
  const uniqueFiles = Array.from(new Set(allFiles.map((f) => f.toString())))
    .map((path) => vscode.Uri.parse(path))
    .slice(0, maxCandidates);

  return uniqueFiles;
}

async function openFiles(
  files: vscode.Uri[],
  mode: 'blocking' | 'background',
): Promise<string[]> {
  const openedFiles: string[] = [];

  for (const file of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(file);

      // Only show in editor if blocking mode
      if (mode === 'blocking') {
        await vscode.window.showTextDocument(doc, { preview: false });
      }

      openedFiles.push(file.toString());
      logToOutputChannel(`✅ Opened file: ${file.toString()}`, 'debug');
    } catch (error) {
      logToOutputChannel(
        `❌ Failed to open file ${file.toString()}: ${error}`,
        'error',
      );
    }
  }

  return openedFiles;
}
