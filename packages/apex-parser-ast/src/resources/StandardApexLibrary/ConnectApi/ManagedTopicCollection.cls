/**
 * A collection of managed topics.
 */
global class ManagedTopicCollection {

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * List of managed topics.
   */
  global List < ConnectApi.ManagedTopic > managedTopics;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

}