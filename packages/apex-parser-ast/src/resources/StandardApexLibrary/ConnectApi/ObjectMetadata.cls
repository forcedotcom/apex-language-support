/**
 * Search metadata related to the object.
 */
global class ObjectMetadata {

  /**
   * Metadata on each data category for the object.
   */
  global Map < String , ConnectApi.DataCategoryMetadata > dataCategories;

  /**
   * Metadata on each field of the object.
   */
  global Map < String , ConnectApi.FieldMetadata > fields;

  /**
   * Name of the object.
   */
  global String label;

  /**
   * Plural name of the object.
   */
  global String labelPlural;

  /**
   * API name of the object
   */
  global String objectApiName;

  /**
   * Theme related to the object.
   */
  global ConnectApi.ThemeInfo themeInfo;

}