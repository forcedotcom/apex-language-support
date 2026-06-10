/**
 * Get managed topics in an Experience Cloud site. Create, delete, and reorder managed topics.
 */
global class ManagedTopics {

  global ManagedTopics() {}

  global static ConnectApi.ManagedTopic createManagedTopic(String communityId, String recordId, ConnectApi.ManagedTopicType managedTopicType) {}

  global static ConnectApi.ManagedTopic createManagedTopic(String communityId, String recordId, ConnectApi.ManagedTopicType managedTopicType, String parentId) {}

  global static ConnectApi.ManagedTopic createManagedTopicByName(String communityId, String name, ConnectApi.ManagedTopicType managedTopicType) {}

  global static ConnectApi.ManagedTopic createManagedTopicByName(String communityId, String name, ConnectApi.ManagedTopicType managedTopicType, String parentId) {}

  global static deleteManagedTopic(String communityId, String managedTopicId) {}

  global static ConnectApi.ManagedTopic getManagedTopic(String communityId, String managedTopicId) {}

  global static ConnectApi.ManagedTopic getManagedTopic(String communityId, String managedTopicId, Integer depth) {}

  global static ConnectApi.ManagedTopicCollection getManagedTopics(String communityId) {}

  global static ConnectApi.ManagedTopicCollection getManagedTopics(String communityId, ConnectApi.ManagedTopicType managedTopicType) {}

  global static ConnectApi.ManagedTopicCollection getManagedTopics(String communityId, ConnectApi.ManagedTopicType managedTopicType, Integer depth) {}

  global static ConnectApi.ManagedTopicCollection getManagedTopics(String communityId, ConnectApi.ManagedTopicType managedTopicType, List<String> recordIds, Integer depth) {}

  global static ConnectApi.ManagedTopicCollection getManagedTopics(String communityId, ConnectApi.ManagedTopicType managedTopicType, Integer pageParam, Integer pageSize) {}

  global static ConnectApi.ManagedTopicCollection reorderManagedTopics(String communityId, ConnectApi.ManagedTopicPositionCollectionInput managedTopicPositionCollection) {}

  global static ConnectApi.ManagedTopicCollection getManagedTopics(String communityId, ConnectApi.ManagedTopicType managedTopicType, String recordId, Integer depth) {}

  global Object clone() {}

}