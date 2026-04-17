/**
 * Return rate of a product (units returned divided by units sold).
 */
global class ProductReturnRateOutputRepresentation {

  /**
   * ID of the product.
   */
  global String productId;

  /**
   * Return rate of specified product. Values range from 0 to 1.
   */
  global Double returnRate;

}