/**
 * Result after requesting a cart item.
 */
global class CartItemResult {

  /**
   * Cart item.
   */
  global ConnectApi.AbstractCartItem cartItem;

  /**
   * Message when the request isn’t successful.
   */
  global String message;

  /**
   * Status for the request.
   */
  global String status;

}