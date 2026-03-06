/**
 * Managed content version.
 */
global class ManagedContentVersion {

  /**
   * Content topics associated with the managed content.
   */
  global ConnectApi.ManagedContentAssociations associations;

  /**
   * Content key of the managed content.
   */
  global String contentKey;

  /**
   * Map of content nodes.
   */
  global Map < String , ConnectApi.ManagedContentNodeValue > contentNodes;

  /**
   * Content URL name of the managed content version.
   */
  global String contentUrlName;

  /**
   * Language of the managed content version.
   */
  global String language;

  /**
   * ID of the managed content.
   */
  global String managedContentId;

  /**
   * Date when the managed content version was last published.
   */
  global Datetime publishedDate;

  /**
   * Title of the managed content version.
   */
  global String title;

  /**
   * Type of managed content version.
   */
  global String type;

  /**
   * Type label of the managed content type.
   */
  global String typeLabel;

  /**
   * Unauthenticated delivery URL.
   */
  global String unauthenticatedUrl;

}