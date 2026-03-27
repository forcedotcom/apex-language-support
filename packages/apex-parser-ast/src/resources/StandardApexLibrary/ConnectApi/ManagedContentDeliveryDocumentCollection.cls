/**
 * Managed content delivery document collection.
 */
global class ManagedContentDeliveryDocumentCollection {

  /**
   * Information about the managed content channel.
   */
  global ConnectApi.ManagedContentChannelSummary channelInfo;

  /**
   * Summary information about the managed content delivery channel.
   */
  global ConnectApi.ManagedContentDeliveryChannelSummaryRepresentation channelSummary;

  /**
   * List of managed content delivery documents.
   */
  global List < ConnectApi.AbstractManagedContentDeliveryDocument > contents;

  /**
   * URL to the current page of managed content records.
   */
  global String currentPageUrl;

  /**
   * URL to the next page of managed content records.
   */
  global String nextPageUrl;

  /**
   * URL to the previous page of managed content records.
   */
  global String previousPageUrl;

  /**
   * Map of references with contentKey as the key.
   */
  global Map < String , ConnectApi.AbstractManagedContentReference > references;

  /**
   * List of references.
   */
  global List < ConnectApi.AbstractManagedContentReference > referencesList;

}