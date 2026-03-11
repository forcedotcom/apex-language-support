/**
 * Site search result.
 */
global class SiteSearchResult {

  /**
   * Token for the current page of search results.
   */
  global String currentPageToken;

  /**
   * URL to the current page of search results.
   */
  global String currentPageUrl;

  /**
   * Collection of search result items.
   */
  global List < ConnectApi.SiteSearchItem > items;

  /**
   * Language of the search results.
   */
  global String language;

  /**
   * Token for the next page of search results.
   */
  global String nextPageToken;

  /**
   * URL to the next page of search results, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Number of items per page in search results.
   */
  global Integer pageSize;

  /**
   * Token for the previous page of search results.
   */
  global String previousPageToken;

  /**
   * URL to the previous page of search results, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * Total number of items in the search results across all pages.
   */
  global Integer totalItems;

}