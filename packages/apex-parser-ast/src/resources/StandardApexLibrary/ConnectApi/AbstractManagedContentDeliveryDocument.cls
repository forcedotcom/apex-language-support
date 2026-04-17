/**
 * Managed content delivery document.
 */
global class AbstractManagedContentDeliveryDocument {

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
   * URL to the single content delivery resource.
   */
  global String resourceUrl;

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