/**
 * Managed content in delivery scope.
 */
global class ManagedContentDeliveryDocument {

  /**
   * Information about the managed content channel.
   */
  global ConnectApi.ManagedContentChannelSummary channelInfo;

  /**
   * Summary information about the managed content delivery channel.
   */
  global ConnectApi.ManagedContentDeliveryChannelSummaryRepresentation channelSummary;

  /**
   * Map of properties of the managed content with their values.
   */
  global Map < String , Object> contentBody;

  /**
   * Globally unique identifier (GUID) for the managed content.
   */
  global String contentKey;

  /**
   * Type of managed content.
   */
  global ConnectApi.ManagedContentTypeSummary contentType;

  /**
   * Language locale of the managed content.
   */
  global String language;

  /**
   * ID of the managed content.
   */
  global String managedContentId;

  /**
   * Most recent publish date of the managed content.
   */
  global Datetime publishedDate;

  /**
   * Map of references with contentKey as the key.
   */
  global Map < String , ConnectApi.AbstractManagedContentReference > references;

  /**
   * List of references.
   */
  global List < ConnectApi.AbstractManagedContentReference > referencesList;

  /**
   * Title of the managed content.
   */
  global String title;

  /**
   * Public URL for the managed content.
   */
  global String unauthenticatedUrl;

  /**
   * URL name of the managed content.
   */
  global String urlName;

}