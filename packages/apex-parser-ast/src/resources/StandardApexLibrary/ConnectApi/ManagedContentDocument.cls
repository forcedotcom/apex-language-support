/**
 * Information about a piece of managed content in an authoring space.
 */
global class ManagedContentDocument {

  /**
   * API name of the managed content.
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
   * Content version of the managed content.
   */
  global Integer contentVersion;

  /**
   * User who created the managed content.
   */
  global ConnectApi.ManagedContentUserSummary createdBy;

  /**
   * Date when the managed content was created.
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
   * Specifies whether the managed content variant is published to a channel ( true ) or not ( false ).
   */
  global Boolean isPublished;

  /**
   * Language locale of the managed content.
   */
  global String language;

  /**
   * User who last modified the managed content.
   */
  global ConnectApi.ManagedContentUserSummary lastModifiedBy;

  /**
   * Date when the managed content was last modified.
   */
  global Datetime lastModifiedDate;

  /**
   * ID of the managed content.
   */
  global String managedContentId;

  /**
   * Managed content variant ID.
   */
  global String managedContentVariantId;

  /**
   * Managed content version ID.
   */
  global String managedContentVersionId;

  /**
   * Status of the managed content variant.
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

  /**
   * Variant version of the managed content.
   */
  global Integer variantVersion;

  /**
   * Version number of the managed content. In version 66.0 and later, use contentVersion and variantVersion for version information.
   */
  global String versionNumber;

}