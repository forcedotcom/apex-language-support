/**
 * A cart, its items, and its adjustment groups.
 */
global class PromotionCart {

  /**
   * Cart adjustment groups belonging to the cart.
   */
  global List < ConnectApi.PromotionCartAdjustmentGroup > cartAdjustmentGroups;

  /**
   * Cart items belonging to the cart.
   */
  global List < ConnectApi.PromotionCartItem > cartItems;

  /**
   * Currency code of the cart.
   */
  global String currencyIsoCode;

  /**
   * ID of the cart.
   */
  global String id;

  /**
   * Total adjustment base amount for the cart.
   */
  global String totalAdjustmentBaseAmount;

  /**
   * Total price of the cart, including adjustments.
   */
  global String totalNetAmount;

  /**
   * Total price of all cart items in the cart.
   */
  global String totalProductBaseAmount;

}