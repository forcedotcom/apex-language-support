/**
 * Collection of managed content delivery channels.
 */
global class ManagedContentDeliveryChannelsRepresentation {

  /**
   * List of managed content delivery channels.
   */
  global List < ConnectApi.ManagedContentDeliveryChannelSummaryRepresentation > channels;

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
   * Total number of managed content delivery channels.
   */
  global Integer totalChannels;

}