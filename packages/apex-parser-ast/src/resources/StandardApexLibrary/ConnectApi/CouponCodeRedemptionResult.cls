/**
 * Coupon code redemption result.
 */
global class CouponCodeRedemptionResult {

  /**
   * Number of coupon code redemptions available.
   */
  global Integer availableRedemptions;

  /**
   * Coupon code.
   */
  global String couponCode;

  /**
   * Error message when coupon code redemption isn’t successful.
   */
  global String errorMsg;

  /**
   * Specifies whether increasing or decreasing the coupon code redemption is successful ( true ) or not ( false ).
   */
  global Boolean isSuccess;

  /**
   * Number of coupon code redemptions allowed.
   */
  global Integer redemptionLimit;

}