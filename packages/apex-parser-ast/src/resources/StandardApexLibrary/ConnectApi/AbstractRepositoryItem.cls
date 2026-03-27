/**
 * A repository item.
 */
global class AbstractRepositoryItem {

  /**
   * Name of the user who created the item.
   */
  global String createdBy;

  /**
   * Date the item was created.
   */
  global Datetime createdDate;

  /**
   * Description of the Item.
   */
  global String description;

  /**
   * ID of the item.
   */
  global String id;

  /**
   * URL to the item type information.
   */
  global String itemTypeUrl;

  /**
   * Name of the user who last modified the item.
   */
  global String modifiedBy;

  /**
   * Date the item was last modified.
   */
  global Datetime modifiedDate;

  /**
   * Motif of the item.
   */
  global ConnectApi.Motif motif;

  /**
   * Name of the item.
   */
  global String name;

  /**
   * Item external repository.
   */
  global ConnectApi.Reference repository;

  /**
   * Item type, file or folder .
   */
  global String type;

  /**
   * The URL to the item.
   */
  global String url;

}