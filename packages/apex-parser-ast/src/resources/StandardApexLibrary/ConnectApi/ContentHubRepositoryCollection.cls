/**
 * A collection of repositories.
 */
global class ContentHubRepositoryCollection {

  /**
   * URL to the current page of repositories.
   */
  global String currentPageUrl;

  /**
   * URL to the next page of repositories, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * URL to the previous page of repositories, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * Collection of repositories.
   */
  global List < ConnectApi.ContentHubRepository > repositories;

}