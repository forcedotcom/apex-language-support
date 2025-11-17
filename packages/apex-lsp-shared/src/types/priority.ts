/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Priority levels for task scheduling and queue processing.
 *
 * Priority values:
 * - Immediate (0): Critical tasks that must execute immediately
 * - High (1): High-priority tasks
 * - Normal (2): Standard priority tasks
 * - Low (3): Low-priority tasks
 * - Background (4): Background tasks
 */
export enum Priority {
  Immediate = 0,
  High = 1,
  Normal = 2,
  Low = 3,
  Background = 4,
}

/**
 * Array of all priority values in order from highest to lowest
 */
export const AllPriorities: readonly Priority[] = [
  Priority.Immediate,
  Priority.High,
  Priority.Normal,
  Priority.Low,
  Priority.Background,
] as const;
