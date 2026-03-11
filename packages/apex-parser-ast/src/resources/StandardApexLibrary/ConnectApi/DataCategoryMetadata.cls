/**
 * Data category metadata for the object.
 */
global class DataCategoryMetadata {

  /**
   * Group name of the data category.
   */
  global String groupName;

  /**
   * Label of the data category.
   */
  global String label;

  /**
   * Map of values for the current data category.
   */
  global Map < String , ConnectApi.DataCategoryValueMetadata > values;

}