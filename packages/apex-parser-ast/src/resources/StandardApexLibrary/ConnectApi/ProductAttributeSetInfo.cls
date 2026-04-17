/**
 * Attribute set metadata.
 */
global class ProductAttributeSetInfo {

  /**
   * Map of the API name of the attribute field to the attribute metadata.
   */
  global Map < String , ConnectApi.ProductAttributeInfo > attributeInfo;

  /**
   * Description of the attribute set.
   */
  global String description;

  /**
   * Developer name of the attribute set.
   */
  global String developerName;

  /**
   * ID of the attribute set.
   */
  global String id;

  /**
   * Label of the attribute set.
   */
  global String masterLabel;

  /**
   * Sequence of the attribute set for the product.
   */
  global Integer sequence;

}