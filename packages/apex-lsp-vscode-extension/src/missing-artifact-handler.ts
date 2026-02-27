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
  IdentifierSpec,
} from '@salesforce/apex-lsp-shared';

export async function handleFindMissingArtifact(
  params: FindMissingArtifactParams,
  _context: vscode.ExtensionContext,
): Promise<FindMissingArtifactResult> {
  const names = params.identifiers.map((s) => s.name).join(', ');
  logToOutputChannel(
    `🔍 Handling missing artifact request for: ${names}`,
    'debug',
  );

  try {
    const workspaceResult = await resolveFromWorkspace(params);
    if (workspaceResult) {
      return workspaceResult;
    }

    logToOutputChannel(
      `❌ Could not find artifact in workspace: ${names}`,
      'debug',
    );
    return { notFound: true };
  } catch (error) {
    logToOutputChannel(
      `❌ Error resolving artifact ${names}: ${error}`,
      'error',
    );
    return { notFound: true };
  }
}

/** Dedupe specs by name; prefer spec with hints over minimal { name } */
function dedupeByIdentifierName(specs: IdentifierSpec[]): IdentifierSpec[] {
  const byName = new Map<string, IdentifierSpec>();
  for (const spec of specs) {
    const existing = byName.get(spec.name);
    const hasHints =
      spec.searchHints?.length ||
      spec.typeReference ||
      spec.resolvedQualifier ||
      spec.parentContext;
    const existingHasHints =
      existing?.searchHints?.length ||
      existing?.typeReference ||
      existing?.resolvedQualifier ||
      existing?.parentContext;
    if (!existing || (hasHints && !existingHasHints)) {
      byName.set(spec.name, spec);
    }
  }
  return Array.from(byName.values());
}

async function resolveFromWorkspace(
  params: FindMissingArtifactParams,
): Promise<FindMissingArtifactResult | null> {
  const { identifiers, mode } = params;
  const maxCandidates = params.maxCandidatesToOpen || 3;

  if (identifiers.length === 0) {
    return { notFound: true };
  }

  const uniqueSpecs = dedupeByIdentifierName(identifiers);
  const allFiles = new Set<string>();

  for (const spec of uniqueSpecs) {
    const searchStrategies = generateSearchStrategiesForSpec(spec);

    for (const strategy of searchStrategies) {
      const files = await searchWithStrategy(strategy, maxCandidates);
      for (const f of files) {
        allFiles.add(f.toString());
      }
      if (files.length > 0) {
        break; // Found for this spec, move to next
      }
    }
  }

  if (allFiles.size > 0) {
    const filesToOpen = Array.from(allFiles)
      .map((p) => vscode.Uri.parse(p))
      .slice(0, maxCandidates);
    const openedFiles = await openFiles(filesToOpen, mode);
    if (openedFiles.length > 0) {
      return { opened: openedFiles };
    }
  }

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

function generateSearchStrategiesForSpec(
  spec: IdentifierSpec,
): SearchStrategy[] {
  const strategies: SearchStrategy[] = [];
  const identifier = spec.name;

  if (spec.searchHints && spec.searchHints.length > 0) {
    for (const hint of spec.searchHints) {
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

  if (spec.resolvedQualifier) {
    const qualifier = spec.resolvedQualifier;
    strategies.push({
      searchPatterns: [`**/${qualifier.name}.cls`],
      priority: 'exact',
      reasoning: `Resolved qualifier: ${qualifier.type} ${qualifier.name}`,
      expectedFileType: 'class',
      confidence: 0.9,
      namespace: qualifier.namespace,
    });
  }

  if (identifier.includes('.')) {
    const [className] = identifier.split('.', 2);
    strategies.push({
      searchPatterns: [`**/${className}.cls`],
      priority: 'high',
      reasoning: `Class.method reference: searching for class ${className}`,
      expectedFileType: 'class',
      confidence: 0.8,
    });
  } else {
    strategies.push({
      searchPatterns: [`**/${identifier}.cls`],
      priority: 'medium',
      reasoning: `Unqualified reference: searching for class ${identifier}`,
      expectedFileType: 'class',
      confidence: 0.6,
    });
  }

  if (spec.typeReference?.qualifier) {
    strategies.push({
      searchPatterns: [`**/${spec.typeReference.qualifier}.cls`],
      priority: 'exact',
      reasoning: `TypeReference qualifier: ${spec.typeReference.qualifier}`,
      expectedFileType: 'class',
      confidence: 0.95,
    });
  }

  if (spec.parentContext?.containingType?.name) {
    strategies.push({
      searchPatterns: [`**/${spec.parentContext.containingType.name}.cls`],
      priority: 'high',
      reasoning: `Parent context: ${spec.parentContext.containingType.name}`,
      expectedFileType: 'class',
      confidence: 0.7,
    });
  }

  strategies.push({
    searchPatterns: [`**/${identifier}*.cls`, `**/${identifier}*.trigger`],
    priority: 'low',
    reasoning: 'Fallback: broad pattern search',
    expectedFileType: 'class',
    confidence: 0.3,
  });

  return strategies.sort((a, b) => b.confidence - a.confidence);
}

async function searchWithStrategy(
  strategy: SearchStrategy,
  maxCandidates: number,
): Promise<vscode.Uri[]> {
  const allFiles: vscode.Uri[] = [];

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

  return Array.from(new Set(allFiles.map((f) => f.toString())))
    .map((path) => vscode.Uri.parse(path))
    .slice(0, maxCandidates);
}

async function openFiles(
  files: vscode.Uri[],
  mode: 'blocking' | 'background',
): Promise<string[]> {
  const openedFiles: string[] = [];

  for (const file of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(file);

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
