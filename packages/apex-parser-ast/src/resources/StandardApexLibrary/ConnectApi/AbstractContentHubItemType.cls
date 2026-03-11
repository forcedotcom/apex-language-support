/**
 * An item type associated with a repository folder.
 */
global class AbstractContentHubItemType {

  /**
   * Support for content streaming. Values are: ContentStreamAllowed ContentStreamNotAllowed ContentStreamRequired
   */
  global ConnectApi.ContentHubStreamSupport contentStreamSupport;

  /**
   * Description of the item type.
   */
  global String description;

  /**
   * Display name of the item type.
   */
  global String displayName;

  /**
   * ID of the item type.
   */
  global String id;

  /**
   * Indicates whether the item type can have versions.
   */
  global Boolean isVersionable;

  /**
   * URL to the detailed information of the item type.
   */
  global String url;

}