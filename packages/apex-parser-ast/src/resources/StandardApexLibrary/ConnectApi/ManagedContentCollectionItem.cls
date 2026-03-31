/**
 * Managed content collection item.
 */
global class ManagedContentCollectionItem {

  /**
   * Map of properties of the collection item with their values.
   */
  global Map < String , Object> body;

  /**
   * Type of collection item.
   */
  global ConnectApi.ManagedContentCollectionItemTypeSummary contentType;

  /**
   * ID of the collection item.
   */
  global String id;

  /**
   * Name or title for collection item.
   */
  global String name;

}