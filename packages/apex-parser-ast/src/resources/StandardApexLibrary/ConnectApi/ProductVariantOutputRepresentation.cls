/**
 * Details about a product variation.
 */
global class ProductVariantOutputRepresentation {

  /**
   * List price.
   */
  global Double listPrice;

  /**
   * Price.
   */
  global Double price;

  /**
   * Product ID.
   */
  global String productId;

  /**
   * Stock Keeping Unit.
   */
  global String stockKeepingUnit;

  /**
   * Unit price.
   */
  global Double unitPrice;

  /**
   * The variation attribute values that define the variation.
   */
  global Map < String , String > variationValues;

}