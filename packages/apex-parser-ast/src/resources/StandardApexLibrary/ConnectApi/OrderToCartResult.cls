/**
 * Result of action adding an order to a cart.
 */
global class OrderToCartResult {

  /**
   * ID of the cart.
   */
  global String cartId;

  /**
   * Number of products that couldn't be successfully added to the cart from the order.
   */
  global Integer totalFailedProductCount;

  /**
   * Number of products successfully added to the cart from the order.
   */
  global Integer totalSucceededProductCount;

  /**
   * List of products not successfully added to the cart.
   */
  global List < ConnectApi.OrderToCartFailedProduct > unaddedProducts;

}