/**
 * Represents limited details about a cart item.
 */
global class CartItemBasic {

  /**
   * ID of the cart item.
   */
  global String cartItemId;

  /**
   * Name of the cart item.
   */
  global String name;

  /**
   * ID of the product associated with the cart item.
   */
  global String productId;

  /**
   * Quantity of the cart item.
   */
  global String quantity;

  /**
   * Type of item in a cart. Value is Product.
   */
  global ConnectApi.CartItemType type;

}