/**
 * Cart items of a specific product type.
 */
global class ProductCartItem {

  /**
   * Items in a cart.
   */
  global List < ConnectApi.CartItemResult > cartItems;

  /**
   * Product summary for a cart item.
   */
  global ConnectApi.CartItemProduct product;

}