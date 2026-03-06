/**
 * A page of comments.
 */
global class CommentPage {

  /**
   * Collection of comments. Important As of version 32.0, use the items property.
   */
  global List < ConnectApi.Comment > comments;

  /**
   * Token identifying the current page.
   */
  global String currentPageToken;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Collection of comments for this feed element.
   */
  global List < ConnectApi.Comment > items;

  /**
   * Token identifying the next page, or null if there isn’t a next page. If you want to read more of the comments in search results, all the comments in the thread are refreshed, not just the ones that match the search term. Avoid using nextPageToken until the comments are refreshed.
   */
  global String nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page. If you want to read more of the comments in search results, all the comments in the thread are refreshed, not just the ones that match the search term. Avoid using nextPageUrl until the comments are refreshed.
   */
  global String nextPageUrl;

  /**
   * Token identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageToken;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * Total number of published comments for the parent feed element.
   */
  global Integer total;

}