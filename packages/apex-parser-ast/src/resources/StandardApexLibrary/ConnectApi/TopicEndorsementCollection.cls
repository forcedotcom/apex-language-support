/**
 * Collection of topic endorsement response bodies.
 */
global class TopicEndorsementCollection {

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * List of topic endorsements.
   */
  global List < ConnectApi.Topic > topicEndorsements;

}