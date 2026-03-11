/**
 * Cart delivery group for a promotion.
 */
global class PromotionCartDeliveryGroup {

  /**
   * ID of the cart delivery group.
   */
  global String cartDeliveryGroupId;

  /**
   * List of methods for the delivery group.
   */
  global List < ConnectApi.PromotionCartDeliveryGroupMethod > cartDeliveryGroupMethods;

  /**
   * ID of the cart.
   */
  global String id;

}