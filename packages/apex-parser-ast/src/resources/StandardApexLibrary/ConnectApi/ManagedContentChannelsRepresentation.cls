/**
 * Collection of managed content channels.
 */
global class ManagedContentChannelsRepresentation {

  /**
   * List of managed content channels.
   */
  global List < ConnectApi.AbstractManagedContentChannelRepresentation > channels;

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
   * Total number of managed content channels.
   */
  global Integer totalChannels;

}