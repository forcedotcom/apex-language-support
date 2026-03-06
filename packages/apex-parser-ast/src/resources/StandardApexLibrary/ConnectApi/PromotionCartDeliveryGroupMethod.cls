/**
 * Cart delivery group method for a promotion.
 */
global class PromotionCartDeliveryGroupMethod {

  /**
   * List of cart delivery method adjustments.
   */
  global List < ConnectApi.PromotionCartDeliveryMethodAdjustment > cartDeliveryMethodAdjustments;

  /**
   * ID of the cart delivery method.
   */
  global String cartDeliveryMethodId;

  /**
   * Price
   */
  global String price;

  /**
   * ID of the shipping rate.
   */
  global String shippingRateId;

  /**
   * Total amount of the adjustment.
   */
  global String totalAdjustmentBaseAmount;

  /**
   * Final price of the cart item after all adjustments.
   */
  global String totalNetAmount;

}