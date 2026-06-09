/**
 * Details of a product.
 */
global class ProductDetail {

  global ProductDetail() {}

  /**
   * Map of the attribute set developer name to its metadata.
   */
  global Map < String , ConnectApi.ProductAttributeSetInfo > attributeSetInfo;

  /**
   * Default image of the product.
   */
  global ConnectApi.ProductMedia defaultImage;

  /**
   * Entitlement details for the product. To get pricing information for products in version 57 and later, use the CommerceStorePricing Class .
   */
  global ConnectApi.ProductEntitlement entitlement;

  /**
   * List of fields for the product.
   */
  global Map < String , String > fields;

  /**
   * ID of the product.
   */
  global String id;

  /**
   * List of media groups of the product.
   */
  global List < ConnectApi.ProductMediaGroup > mediaGroups;

  /**
   * Primary category path of the product.
   */
  global ConnectApi.ProductCategoryPath primaryProductCategoryPath;

  /**
   * Class of product. Values are: Bundle Set Simple Variation VariationParent
   */
  global ConnectApi.ProductClass productClass;

  /**
   * List of product selling models for the product.
   */
  global List < ConnectApi.ProductSellingModel > productSellingModels;

  /**
   * If one exists, purchase quantity rule for the product.
   */
  global ConnectApi.PurchaseQuantityRule purchaseQuantityRule;

  /**
   * SEO-friendly URL name for the product.
   */
  global String urlName;

  /**
   * Variation attribute set for the product.
   */
  global ConnectApi.ProductAttributeSet variationAttributeSet;

  /**
   * Available and allowable values for variation attributes and a map to resolve variation product IDs from attribute value combinations.
   */
  global ConnectApi.ProductVariationInfo variationInfo;

  /**
   * ID of the variation parent.
   */
  global String variationParentId;

  global Object clone() {}

  global Map<String,ConnectApi.ProductAttributeSetInfo> getAttributeSetInfo() {}

  global ConnectApi.ProductMedia getDefaultImage() {}

  global Integer getDynamicAttributeCount() {}

  global ConnectApi.ProductEntitlement getEntitlement() {}

  global Map<String,String> getFields() {}

  global String getId() {}

  global Boolean getIsConfigurationAllowed() {}

  global List<ConnectApi.ProductMediaGroup> getMediaGroups() {}

  global ConnectApi.ProductCategoryPath getPrimaryProductCategoryPath() {}

  global ConnectApi.ProductClass getProductClass() {}

  global List<ConnectApi.ProductSellingModel> getProductSellingModels() {}

  global ConnectApi.PurchaseQuantityRule getPurchaseQuantityRule() {}

  global String getUrlName() {}

  global ConnectApi.ProductAttributeSet getVariationAttributeSet() {}

  global ConnectApi.ProductVariationInfo getVariationInfo() {}

  global String getVariationParentId() {}

  global void setAttributeSetInfo(Map<String,ConnectApi.ProductAttributeSetInfo> value) {}

  global void setDefaultImage(ConnectApi.ProductMedia value) {}

  global void setDynamicAttributeCount(Integer value) {}

  global void setEntitlement(ConnectApi.ProductEntitlement value) {}

  global void setFields(Map<String,String> value) {}

  global void setId(String value) {}

  global void setIsConfigurationAllowed(Boolean value) {}

  global void setMediaGroups(List<ConnectApi.ProductMediaGroup> value) {}

  global void setPrimaryProductCategoryPath(ConnectApi.ProductCategoryPath value) {}

  global void setProductClass(ConnectApi.ProductClass value) {}

  global void setProductSellingModels(List<ConnectApi.ProductSellingModel> value) {}

  global void setPurchaseQuantityRule(ConnectApi.PurchaseQuantityRule value) {}

  global void setUrlName(String value) {}

  global void setVariationAttributeSet(ConnectApi.ProductAttributeSet value) {}

  global void setVariationInfo(ConnectApi.ProductVariationInfo value) {}

  global void setVariationParentId(String value) {}

}