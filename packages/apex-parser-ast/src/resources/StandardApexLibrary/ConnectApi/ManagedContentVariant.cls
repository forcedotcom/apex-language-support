/**
 * Managed content variant.
 */
global class ManagedContentVariant {

  /**
   * API name of the managed content variant.
   */
  global String apiName;

  /**
   * Map of properties of the managed content with their values.
   */
  global Map < String , Object> contentBody;

  /**
   * Fully qualified name (FQN) of the managed content.
   */
  global String contentFqn;

  /**
   * Globally unique identifier (GUID) for the managed content.
   */
  global String contentKey;

  /**
   * Content space of the managed content.
   */
  global ConnectApi.ManagedContentSpaceSummary contentSpace;

  /**
   * Type of managed content.
   */
  global ConnectApi.ManagedContentTypeSummary contentType;

  /**
   * User who created the managed content variant.
   */
  global ConnectApi.ManagedContentUserSummary createdBy;

  /**
   * Date when the managed content variant was created.
   */
  global Datetime createdDate;

  /**
   * External ID of the managed content.
   */
  global String externalId;

  /**
   * Folder of the managed content.
   */
  global ConnectApi.ManagedContentFolderSummary folder;

  /**
   * Specifies whether the managed content variant is published to a channel (true) or not (false).
   */
  global Boolean isPublished;

  /**
   * Language locale of the managed content.
   */
  global String language;

  /**
   * User who last modified the managed content variant.
   */
  global ConnectApi.ManagedContentUserSummary lastModifiedBy;

  /**
   * Date when the managed content variant was last modified.
   */
  global Datetime lastModifiedDate;

  /**
   * ID of the managed content.
   */
  global String managedContentId;

  /**
   * ID of the managed content variant.
   */
  global String managedContentVariantId;

  /**
   * Managed content version ID.
   */
  global String managedContentVersionId;

  /**
   * Information about a managed content variant's status in the authoring space.
   */
  global ConnectApi.ManagedContentVariantStatusOutput status;

  /**
   * Title of the managed content.
   */
  global String title;

  /**
   * URL name of the managed content.
   */
  global String urlName;

}