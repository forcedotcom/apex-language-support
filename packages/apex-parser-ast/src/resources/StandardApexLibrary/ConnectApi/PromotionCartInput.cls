/**
 * Cart during promotion evaluation.
 */
global class PromotionCartInput {

  /**
   * Collection of cart adjustment groups associated with the items in the cart.
   */
  global ConnectApi.PromotionCartAdjustmentGroupInput [] cartAdjustmentGroups;

  /**
   * Collection of cart delivery groups associated with the items in the cart. Available if shipping promotions are enabled.
   */
  global ConnectApi.PromotionCartDeliveryGroupInput [] cartDeliveryGroups;

  /**
   * A collection of items in the cart.
   */
  global List < ConnectApi.PromotionCartItemInput > cartItems;

  /**
   * Three-letter ISO 4217 currency code associated with the cart.
   */
  global String currencyIsoCode;

  /**
   * ID of the cart.
   */
  global String id;

}