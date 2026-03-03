/**
 * The Search.QuestionSuggestionFilter class filters results from a call to System.Search.suggest(searchQuery, sObjectType, options) when the SOSL searchQuery contains a FeedItem object.
 */
global class QuestionSuggestionFilter {

  /**
   * Adds a filter to display questions associated with the single specified group whose ID is passed in as an argument. This filter is optional.
   * @param groupId The ID for a group.
   */
  public void addGroupId(String groupId) {}

  /**
   * Adds a filter to display questions associated with the single specified network whose ID is passed in as an argument. This filter is optional.
   * @param networkId The ID of the Experience Cloud site about which you’re retrieving this information.
   */
  public void addNetworkId(String networkId) {}

  /**
   * Adds a filter to display questions belonging to the single specified user whose ID is passed in as an argument. This filter is optional.
   * @param userId The ID for the user.
   */
  public void addUserId(String userId) {}

  /**
   * Sets a new list of groups to replace the current list of groups where the group IDs are passed in as an argument. This filter is optional.
   * @param groupIds A list of group IDs.
   */
  public void setGroupIds(List< String > groupIds) {}

  /**
   * Sets a new list of networks to replace the current list of networks where the network IDs are passed in as an argument. This filter is optional.
   * @param networkIds A list of network IDs.
   */
  public void setNetworkIds(List< String > networkIds) {}

  /**
   * Sets a filter to display questions associated with the single specified topic whose ID is passed in as an argument. This filter is optional.
   * @param topicId The ID for a topic.
   */
  public void setTopicId(String topicId) {}

  /**
   * Sets a new list of users to replace the current list of users where the users IDs are passed in as an argument. This filter is optional.
   * @param userIds A list of user IDs.
   */
  public void setUserIds(List< String > userIds) {}

}