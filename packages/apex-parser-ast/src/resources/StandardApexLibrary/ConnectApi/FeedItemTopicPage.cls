/**
 * Feed item topic page.
 */
global class FeedItemTopicPage {

  /**
   * true if a topic can be assigned to the feed item, false otherwise.
   */
  global Boolean canAssignTopics;

  /**
   * List of topics.
   */
  global List < ConnectApi.Topic > topics;

}