/**
 * Product summary.
 */
global class ProductSummary {

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

}