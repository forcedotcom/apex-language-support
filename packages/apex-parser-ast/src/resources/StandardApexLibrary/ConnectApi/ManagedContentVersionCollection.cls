/**
 * Collection of managed content versions.
 */
global class ManagedContentVersionCollection {

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * List of managed content versions.
   */
  global List < ConnectApi.ManagedContentVersion > items;

  /**
   * Map of managed content types.
   */
  global Map < String , ConnectApi.ManagedContentType > managedContentTypes;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Total number of managed content versions.
   */
  global Integer total;

  /**
   * Total number of managed content types.
   */
  global Integer totalTypes;

}