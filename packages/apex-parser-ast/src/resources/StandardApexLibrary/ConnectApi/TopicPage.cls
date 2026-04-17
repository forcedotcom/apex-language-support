/**
 * Page of topics.
 */
global class TopicPage {

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * List of topics.
   */
  global List < ConnectApi.Topic > topics;

}