/**
 * Input for action adding an order to a cart.
 */
global class OrderToCartInput {

  global OrderToCartInput() {}

  /**
   * Cart state ( active or current ) or the ID of the cart to which the products from an order are to be copied.
   */
  global String cartStateOrId;

  global Object clone() {}

}