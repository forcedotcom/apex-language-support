/**
 * Paginated list of Mention Completion response bodies.
 */
global class MentionCompletionPage {

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * A list of mention completion proposals. Use these proposals to build a feed post body.
   */
  global List < ConnectApi.MentionCompletion > mentionCompletions;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

}