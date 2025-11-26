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
 * - Immediate (1): Critical tasks that must execute immediately
 * - High (2): High-priority tasks
 * - Normal (3): Standard priority tasks
 * - Low (4): Low-priority tasks
 * - Background (5): Background tasks
 */
export enum Priority {
  Immediate = 1,
  High = 2,
  Normal = 3,
  Low = 4,
  Background = 5,
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
