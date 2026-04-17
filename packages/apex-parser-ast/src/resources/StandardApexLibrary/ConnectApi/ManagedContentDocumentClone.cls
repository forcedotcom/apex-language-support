/**
 * Managed content document clone.
 */
global class ManagedContentDocumentClone {

  /**
   * API name of the cloned content.
   */
  global String apiName;

  /**
   * Status of the cloned content.
   */
  global ConnectApi.ManagedContentCloneStatus cloneStatus;

  /**
   * Globally unique identifier (GUID) for the cloned content.
   */
  global String contentKey;

  /**
   * Error message if the primary variant failed to clone.
   */
  global String errorMessage;

  /**
   * Information about failed cloned variants if cloning was partially successful.
   */
  global List < ConnectApi.ManagedContentFailedVariants > failedVariants;

  /**
   * Folder of the cloned content.
   */
  global ConnectApi.ManagedContentFolderSummary folder;

  /**
   * ID of the cloned content in the authoring workspace.
   */
  global String managedContentId;

  /**
   * Resource URL of the cloned content.
   */
  global String resourceURL;

  /**
   * ID or content key of the source managed content in the authoring workspace.
   */
  global String sourceContentKeyOrId;

  /**
   * Title of cloned content.
   */
  global String title;

  /**
   * List of cloned variants.
   */
  global List < ConnectApi.ManagedContentClonedVariants > variants;

}