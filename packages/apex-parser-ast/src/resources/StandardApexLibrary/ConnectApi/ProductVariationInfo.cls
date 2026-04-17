/**
 * Product variation attributes, metadata, and mappings of attribute combinations to variation product IDs.
 */
global class ProductVariationInfo {

  /**
   * List ordered by ProductAttribute.Sequence values that map the attribute value combinations to the variation product ID.
   */
  global List < ConnectApi.ProductAttributesToProductEntry > attributesToProductMappings;

  /**
   * Map of field API name to product attribute information.
   */
  global Map < String , ConnectApi.ProductAttributeInfo > variationAttributeInfo;

}