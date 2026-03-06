/**
 * A promotion associated with a cart.
 */
global class CartPromotionOutputRepresentation {

  /**
   * Adjustment amount out of the promotion.
   */
  global String adjustmentAmount;

  /**
   * Coupon code for a promotion. A coupon code is available only for manual promotions, not for automatic promotions.
   */
  global String couponCode;

  /**
   * Currency ISO code associated with the cart.
   */
  global String currencyIsoCode;

  /**
   * Localized display name of the promotion.
   */
  global String displayName;

  /**
   * ID of the promotion.
   */
  global String promotionId;

  /**
   * Promotion target type. Values are: Cart —Promotion targets a cart. Item —Promotion targets an item in a cart.
   */
  global ConnectApi.CartPromotionType targetType;

  /**
   * Localized terms and conditions for the promotion.
   */
  global String termsAndConditions;

}