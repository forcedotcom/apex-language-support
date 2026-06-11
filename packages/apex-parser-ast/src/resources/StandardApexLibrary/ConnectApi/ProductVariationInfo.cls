/**
 * Product variation attributes, metadata, and mappings of attribute combinations to variation product IDs.
 */
global class ProductVariationInfo {

  global ProductVariationInfo() {}

  /**
   * List ordered by ProductAttribute.Sequence values that map the attribute value combinations to the variation product ID.
   */
  global List < ConnectApi.ProductAttributesToProductEntry > attributesToProductMappings;

  /**
   * Map of field API name to product attribute information.
   */
  global Map < String , ConnectApi.ProductAttributeInfo > variationAttributeInfo;

  global Object clone() {}

  global List<ConnectApi.ProductAttributesToProductEntry> getAttributesToProductMappings() {}

  global Map<String,ConnectApi.ProductAttributeInfo> getVariationAttributeInfo() {}

  global Integer getVariationCount() {}

  global void setAttributesToProductMappings(List<ConnectApi.ProductAttributesToProductEntry> value) {}

  global void setVariationAttributeInfo(Map<String,ConnectApi.ProductAttributeInfo> value) {}

  global void setVariationCount(Integer value) {}

}