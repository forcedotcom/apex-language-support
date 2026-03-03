/**
 * Get managed topics in an Experience Cloud site. Create, delete, and reorder managed topics.
 */
global class ManagedTopics {

  public static ConnectApi.ManagedTopic createManagedTopic(String communityId, String recordId, ConnectApi.ManagedTopicType managedTopicType) {}

  public static ConnectApi.ManagedTopic createManagedTopic(String communityId, String recordId, ConnectApi.ManagedTopicType managedTopicType, String parentId) {}

  public static ConnectApi.ManagedTopic createManagedTopicByName(String communityId, String name, ConnectApi.ManagedTopicType managedTopicType) {}

  public static ConnectApi.ManagedTopic createManagedTopicByName(String communityId, String name, ConnectApi.ManagedTopicType managedTopicType, String parentId) {}

  public static deleteManagedTopic(String communityId, String managedTopicId) {}

  public static ConnectApi.ManagedTopic getManagedTopic(String communityId, String managedTopicId) {}

  public static ConnectApi.ManagedTopic getManagedTopic(String communityId, String managedTopicId, Integer depth) {}

  public static ConnectApi.ManagedTopicCollection getManagedTopics(String communityId) {}

  public static ConnectApi.ManagedTopicCollection getManagedTopics(String communityId, ConnectApi.ManagedTopicType managedTopicType) {}

  public static ConnectApi.ManagedTopicCollection getManagedTopics(String communityId, ConnectApi.ManagedTopicType managedTopicType, Integer depth) {}

  public static ConnectApi.ManagedTopicCollection getManagedTopics(String communityId, ConnectApi.ManagedTopicType managedTopicType, List< String > recordIds, Integer depth) {}

  public static ConnectApi.ManagedTopicCollection getManagedTopics(String communityId, ConnectApi.ManagedTopicType managedTopicType, Integer pageParam, Integer pageSize) {}

  public static ConnectApi.ManagedTopicCollection reorderManagedTopics(String communityId, ConnectApi.ManagedTopicPositionCollectionInput managedTopicPositionCollection) {}

  public static ConnectApi.ManagedTopicCollection getManagedTopics(String communityId, ConnectApi.ManagedTopicType managedTopicType, String recordId, Integer depth) {}

}