/**
 * IDs of the cart delivery group and its delivery method.
 */
global class PromotionCartDeliveryGroupInput {

  global PromotionCartDeliveryGroupInput() {}

  /**
   * ID of the cart delivery group.
   */
  global String cartDeliveryGroupId;

  /**
   * ID of the order delivery method.
   */
  global String deliveryMethodId;

  global Object clone() {}

}