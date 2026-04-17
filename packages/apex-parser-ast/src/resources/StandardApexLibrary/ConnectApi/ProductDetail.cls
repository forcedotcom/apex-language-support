/**
 * Details of a product.
 */
global class ProductDetail {

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

}