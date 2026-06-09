/**
 * Product summary.
 */
global class ProductSummary {

  global ProductSummary() {}

  /**
   * Default image of the product.
   */
  global ConnectApi.ProductMedia defaultImage;

  /**
   * Map of fields belonging to the product.
   */
  global Map < String , ConnectApi.FieldValue > fields;

  /**
   * ID of the product.
   */
  global String id;

  /**
   * Name of the product.
   */
  global String name;

  /**
   * Prices of the product.
   */
  global ConnectApi.PricingResultLineItem prices;

  /**
   * Class of product. Values are: Bundle Set Simple Variation VariationParent
   */
  global ConnectApi.ProductClass productClass;

  /**
   * Product selling model information.
   */
  global ConnectApi.CommerceProductSellingModel productSellingModelInformation;

  /**
   * If one exists, purchase quantity rule for the product.
   */
  global ConnectApi.PurchaseQuantityRule purchaseQuantityRule;

  /**
   * SEO-friendly URL name for the product.
   */
  global String urlName;

  /**
   * Variation attribute set that’s associated with the product.
   */
  global ConnectApi.ProductAttributeSetSummary variationAttributeSet;

  global Object clone() {}

  global ConnectApi.ProductMedia getDefaultImage() {}

  global Map<String,ConnectApi.FieldValue> getFields() {}

  global String getId() {}

  global String getName() {}

  global ConnectApi.PricingResultLineItem getPrices() {}

  global ConnectApi.ProductClass getProductClass() {}

  global ConnectApi.CommerceProductSellingModel getProductSellingModelInformation() {}

  global ConnectApi.PurchaseQuantityRule getPurchaseQuantityRule() {}

  global String getUrlName() {}

  global ConnectApi.ProductAttributeSetSummary getVariationAttributeSet() {}

  global void setDefaultImage(ConnectApi.ProductMedia value) {}

  global void setFields(Map<String,ConnectApi.FieldValue> value) {}

  global void setId(String value) {}

  global void setName(String value) {}

  global void setPrices(ConnectApi.PricingResultLineItem value) {}

  global void setProductClass(ConnectApi.ProductClass value) {}

  global void setProductSellingModelInformation(ConnectApi.CommerceProductSellingModel value) {}

  global void setPurchaseQuantityRule(ConnectApi.PurchaseQuantityRule value) {}

  global void setUrlName(String value) {}

  global void setVariationAttributeSet(ConnectApi.ProductAttributeSetSummary value) {}

}