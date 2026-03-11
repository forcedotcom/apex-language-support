/**
 * Overview of a product, with summary information about prices, selected fields, and the product’s default image.
 */
global class ProductOverview {

  /**
   * Media representation of the product's default image.
   */
  global ConnectApi.ProductMedia defaultImage;

  /**
   * Error code and error message.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * Map of fields belonging to the product.
   */
  global Map < String , String > fields;

  /**
   * ID of the product.
   */
  global String id;

  /**
   * Price of the product. To get pricing information for products in version 58 and later, use the CommerceStorePricing Class .
   */
  global ConnectApi.PricingResultLineItem prices;

  /**
   * SKU of the product.
   */
  global String sku;

  /**
   * Represents whether execution was successful and product overview information was retrieved without error.
   */
  global Boolean success;

}