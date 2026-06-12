/**
 * A coupon used in a promotion.
 */
global class PromotionCoupon {

  global PromotionCoupon() {}

  /**
   * Coupon code.
   */
  global String couponCode;

  /**
   * Error code returned if the coupon is invalid.
   */
  global String couponErrorCode;

  /**
   * ID of the coupon.
   */
  global String id;

  /**
   * Indicates whether the coupon is valid ( true ) or invalid ( false ).
   */
  global Boolean isValidCoupon;

  global Object clone() {}

}