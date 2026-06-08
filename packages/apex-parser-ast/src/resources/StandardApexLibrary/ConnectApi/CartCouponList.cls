/**
 * List of coupons for a cart.
 */
global class CartCouponList {

  global CartCouponList() {}

  /**
   * List of coupons associated with a cart.
   */
  global List < ConnectApi.CartCoupon > coupons;

  global Object clone() {}

}