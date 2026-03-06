/**
 * Results of a promotion evaluation.
 */
global class PromotionEvaluation {

  /**
   * Cart and its items.
   */
  global ConnectApi.PromotionCart cart;

  /**
   * Collection of coupon codes to enable promotions. A customer can apply a maximum of two coupons.
   */
  global List < ConnectApi.PromotionCoupon > coupons;

}