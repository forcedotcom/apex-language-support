/**
 * A collection of extension definitions.
 */
global class ExtensionDefinitions {

  /**
   * Token identifying the current page.
   */
  global String currentPageToken;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Collection of extension definitions.
   */
  global List < ConnectApi.ExtensionDefinition > extensionDefinitions;

  /**
   * Token identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Total number of extensions returned.
   */
  global Integer total;

}