import { ResolutionRequest, ResolutionStrategy } from './types';
import { positionBasedResolutionStrategy } from './positionBasedResolution';

/**
 * Available resolution strategies ordered by priority
 */
const availableStrategies: ResolutionStrategy[] = [
  positionBasedResolutionStrategy,
  // Future strategies can be added here
];

/**
 * Selects the appropriate resolution strategy for a given request
 */
export const selectResolutionStrategy = (
  request: ResolutionRequest,
): ResolutionStrategy | undefined => {
  // Find strategies that can resolve this request
  const applicableStrategies = availableStrategies.filter((strategy) =>
    strategy.canResolve(request),
  );

  if (applicableStrategies.length === 0) {
    return undefined;
  }

  // Return the highest priority strategy
  return applicableStrategies.reduce((highest, current) =>
    getPriorityValue(current.priority) > getPriorityValue(highest.priority)
      ? current
      : highest,
  );
};

/**
 * Gets the numeric priority value for comparison
 */
const getPriorityValue = (priority: ResolutionStrategy['priority']): number => {
  const priorityMap = { high: 3, medium: 2, low: 1 };
  return priorityMap[priority];
};

/**
 * Registers a new resolution strategy
 */
export const registerStrategy = (strategy: ResolutionStrategy): void => {
  availableStrategies.push(strategy);
  // Sort by priority (highest first)
  availableStrategies.sort(
    (a, b) => getPriorityValue(b.priority) - getPriorityValue(a.priority),
  );
};

/**
 * Gets all available strategies
 */
export const getAvailableStrategies = (): readonly ResolutionStrategy[] => {
  return availableStrategies;
};
