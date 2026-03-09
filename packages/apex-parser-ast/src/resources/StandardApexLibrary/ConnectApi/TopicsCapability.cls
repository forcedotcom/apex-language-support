/**
 * If a feed element has this capability, the context user can add topics to it. Topics help users organize and discover conversations.
 */
global class TopicsCapability extends ConnectApi.FeedElementCapability {

  /**
   * true if a topic can be assigned to the feed element, false otherwise.
   */
  global Boolean canAssignTopics;

  /**
   * A collection of topics associated with this feed element.
   */
  global List < ConnectApi.Topic > items;

}