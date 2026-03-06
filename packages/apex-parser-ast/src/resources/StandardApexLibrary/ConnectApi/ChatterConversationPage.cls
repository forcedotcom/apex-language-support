/**
 * Chatter conversation page.
 */
global class ChatterConversationPage {

  /**
   * List of conversations on the page.
   */
  global List < ConnectApi.ChatterConversationSummary > conversations;

  /**
   * Token identifying the current page.
   */
  global String currentPageToken;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Token identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

}