/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Diagnostic } from 'vscode-languageserver';

/**
 * Evidence for diagnostic analysis
 */
export interface AnalysisEvidence {
  type: 'node' | 'edge' | 'relationship';
  description: string;
  nodeId?: string;
  edgeId?: string;
}

/**
 * Result of analyzing a diagnostic for false positive detection
 */
export interface DiagnosticAnalysis {
  isFalsePositive: boolean;
  reason: string;
  evidence: AnalysisEvidence[];
  suggestions?: string[];
}

/**
 * Correlation between a diagnostic and related graph nodes/edges
 */
export interface DiagnosticGraphCorrelation {
  diagnostic: Diagnostic;
  relatedNodeIds: string[];
  relatedEdgeIds: string[];
  analysis?: DiagnosticAnalysis;
}
