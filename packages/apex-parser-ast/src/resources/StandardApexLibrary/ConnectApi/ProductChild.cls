/**
 * Child product related to a parent product.
 */
global class ProductChild {

  /**
   * Default quantity of child products to be ordered.
   */
  global String defaultQuantity;

  /**
   * Specifies whether the child product can be viewed on the product detail page ( true ) or not ( false ).
   */
  global Boolean isEntitled;

  /**
   * Product details of the child product.
   */
  global ConnectApi.ProductDetail productInfo;

}