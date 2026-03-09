/**
 * If a feed element has this capability, it has one or more extension attachments.
 */
global class ExtensionsCapability extends ConnectApi.FeedElementCapability {

  /**
   * List of extensions associated with the feed element.
   */
  global List < ConnectApi.Extension > items;

}