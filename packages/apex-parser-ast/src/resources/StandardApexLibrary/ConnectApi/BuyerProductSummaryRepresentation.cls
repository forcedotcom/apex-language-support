/**
 * Representation of the buyer's product summary.
 */
global class BuyerProductSummaryRepresentation {

  global BuyerProductSummaryRepresentation() {}

  /**
   * ID of the product.
   */
  global String > id;

  /**
   * Name of the product.
   */
  global String name;

  /**
   * Product summary information for the line item.
   */
  global ConnectApi.ProductImageOutputRepresentation image;

  /**
   * List of variation attributes (color, size, and so on) associated with the product.
   */
  global ConnectApi.ProductVariationAttributesRepresentation variationAttributes;

  /**
   * Product summary details for the line item.
   */
  global Map < String , ConnectApi.RecordFieldRepresentation > fields;

  /**
   * Stock Keeping Unit (SKU) of the product.
   */
  global String sku;

  /**
   * Indicates whether the context user can view the product ( true ) or not ( false ).
   */
  global Boolean canViewProduct;

  /**
   * Indicates whether the request was successful ( true ) or not ( false ).
   */
  global Boolean success;

  global Object clone() {}

}