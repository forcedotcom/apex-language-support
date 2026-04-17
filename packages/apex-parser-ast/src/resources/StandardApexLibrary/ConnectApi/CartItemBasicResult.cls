/**
 * Represents the result of a cart request.
 */
global class CartItemBasicResult {

  /**
   * Item in a cart.
   */
  global ConnectApi.CartItemBasic cartItem;

  /**
   * Error message when the request is not successful.
   */
  global String message;

  /**
   * Status of the request.
   */
  global String status;

}