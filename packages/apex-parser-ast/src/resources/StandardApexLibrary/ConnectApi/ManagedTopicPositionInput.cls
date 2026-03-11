/**
 * Relative position of a managed topic.
 */
global class ManagedTopicPositionInput {

  /**
   * ID of existing managed topic.
   */
  global String managedTopicId;

  /**
   * Relative position of the managed topic, indicated by zero-indexed, ascending whole numbers.
   */
  global Integer position;

}