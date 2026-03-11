/**
 * List of managed content space channels.
 */
global class ManagedContentSpaceChannelsRepresentation {

  /**
   * URL to the current page of managed content space channels.
   */
  global String currentPageUrl;

  /**
   * URL to the next page of Mmanaged content space channels.
   */
  global String nextPageUrl;

  /**
   * URL to the previous page of managed content space channels.
   */
  global String previousPageUrl;

  /**
   * List of managed content space channels.
   */
  global List < ConnectApi.ManagedContentSpaceChannelRepresentation > spaceChannels;

  /**
   * Total count of managed content space channels returned for the request.
   */
  global Integer totalSpaceChannels;

}