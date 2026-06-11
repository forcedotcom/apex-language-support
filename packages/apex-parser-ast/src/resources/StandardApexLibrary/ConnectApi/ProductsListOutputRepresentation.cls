/**
 * Output representation of products with product data along with expand details.
 */
global class ProductsListOutputRepresentation {

  global ProductsListOutputRepresentation() {}

  /**
   * The product’s identifier.
   */
  global List ConnectApi.ProductOutputRepresentation <> product;

  global Object clone() {}

}