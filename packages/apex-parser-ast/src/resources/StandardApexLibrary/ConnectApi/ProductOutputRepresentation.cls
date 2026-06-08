/**
 * Output representation for product data.
 */
global class ProductOutputRepresentation {

  global ProductOutputRepresentation() {}

  /**
   * Output representation for expand feature.
   */
  global ConnectApi.ProductExpandOutputRepresentation expand;

  /**
   * Product data.
   */
  global String products;

  global Object clone() {}

}