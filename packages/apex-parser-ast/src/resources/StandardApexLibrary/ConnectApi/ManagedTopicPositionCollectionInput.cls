/**
 * A collection of relative positions of managed topics.
 */
global class ManagedTopicPositionCollectionInput {

  /**
   * List of relative positions of managed topics. This list can include Featured and Navigational managed topics and doesn’t need to include all managed topics. For more information about reordering managed topics, see the example in reorderManagedTopics(communityId, managedTopicPositionCollection) .
   */
  global List < ConnectApi.ManagedTopicPositionInput > managedTopicPositions;

}