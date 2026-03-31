/**
 * A collection of repository folder items.
 */
global class RepositoryFolderItemsCollection {

  /**
   * URL to the current page of items.
   */
  global String currentPageUrl;

  /**
   * Collection of items in a repository folder.
   */
  global List < ConnectApi.RepositoryFolderItem > items;

  /**
   * URL to the next page of items, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * URL to the previous page of items, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

}