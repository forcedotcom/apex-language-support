/**
 * Composite product input.
 */
global class CompositeCommerceProductInputRepresentation {

  /**
   * Attribute set information for a variation parent product.
   */
  global ConnectApi.ProductAttributeSetInputRepresentation attributeSetInfo;

  /**
   * List of category IDs associated with the product.
   */
  global List < String > categoryIds;

  /**
   * A map of product field names and their values.
   */
  global Map< String , String > productFields;

  /**
   * Media associated with the product.
   */
  global ConnectApi.ProductMedia productMedia;

}