/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexSymbol } from './symbol';

/**
 * Symbol metrics for analysis
 */
export interface SymbolMetrics {
  referenceCount: number;
  dependencyCount: number;
  dependentCount: number;
  cyclomaticComplexity: number;
  depthOfInheritance: number;
  couplingScore: number;
  impactScore: number;
  changeImpactRadius: number;
  refactoringRisk: number;
  usagePatterns: string[];
  accessPatterns: string[];
  lifecycleStage: 'active' | 'deprecated' | 'legacy' | 'experimental';
}

/**
 * System-level statistics for the Apex Symbol Manager
 */
export interface SystemStats {
  totalSymbols: number;
  totalFiles: number;
  totalReferences: number;
  circularDependencies: number;
  cacheHitRate: number;
  totalCacheEntries: number;
  lastCleanup: number;
  memoryOptimizationLevel: string;
}

/**
 * Memory pool statistics
 */
export interface MemoryPoolStats {
  totalReferences: number;
  activeReferences: number;
  referenceEfficiency: number;
  poolSize: number;
}

/**
 * Memory usage statistics for the Apex Symbol Manager
 */
export interface MemoryUsageStats {
  totalSymbols: number;
  totalCacheEntries: number;
  estimatedMemoryUsage: number;
  fileMetadataSize: number;
  memoryOptimizationLevel: string;
  cacheEfficiency: number;
  recommendations: string[];
  memoryPoolStats: MemoryPoolStats;
  symbolCacheSize: number;
}

/**
 * Performance metrics for the Apex Symbol Manager
 */
export interface PerformanceMetrics {
  totalQueries: number;
  averageQueryTime: number;
  cacheHitRate: number;
  slowQueries: Array<{ query: string; time: number }>;
  memoryUsage: number;
}

/**
 * Relationship statistics for a symbol
 */
export interface RelationshipStats {
  totalReferences: number;
  methodCalls: number;
  fieldAccess: number;
  typeReferences: number;
  constructorCalls: number;
  staticAccess: number;
  importReferences: number;
  relationshipTypeCounts: Map<string, number>;
  mostCommonRelationshipType: string | null;
  leastCommonRelationshipType: string | null;
  averageReferencesPerType: number;
}

/**
 * Pattern analysis result for relationship patterns
 */
export interface PatternAnalysis {
  totalSymbols: number;
  totalRelationships: number;
  relationshipPatterns: Map<string, number>;
  patternInsights: string[];
  mostCommonPatterns: Array<{
    pattern: string;
    count: number;
    percentage: number;
    matchingSymbols: ApexSymbol[];
  }>;
  averageRelationshipsPerSymbol: number;
}
