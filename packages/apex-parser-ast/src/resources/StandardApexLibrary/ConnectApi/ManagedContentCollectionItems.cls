/**
 * Managed content collection Items.
 */
global class ManagedContentCollectionItems {

  /**
   * Information about the managed content channel.
   */
  global ConnectApi.ManagedContentChannelSummary channelInfo;

  /**
   * Summary information about the managed content delivery channel.
   */
  global ConnectApi.ManagedContentDeliveryChannelSummaryRepresentation channelSummary;

  /**
   * Unique identifier for the collection.
   */
  global String collectionKey;

  /**
   * Type of collection.
   */
  global ConnectApi.ManagedContentTypeSummary collectionType;

  /**
   * URL to the current page.
   */
  global String currentPageUrl;

  /**
   * ID of the collection.
   */
  global String id;

  /**
   * List of collection Items.
   */
  global List < ConnectApi.ManagedContentCollectionItem > items;

  /**
   * Language locale of the collection.
   */
  global String language;

  /**
   * URL to the next page.
   */
  global String nextPageUrl;

  /**
   * URL to the previous page.
   */
  global String previousPageUrl;

  /**
   * Most recent publish date of the collection.
   */
  global Datetime publishedDate;

  /**
   * Title of the collection.
   */
  global String title;

  /**
   * Total number of items in the current collection detail page.
   */
  global Integer total;

  /**
   * URL name of the collection.
   */
  global String urlName;

}