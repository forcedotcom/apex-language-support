/**
 * Bonus product for a promotion.
 */
global class PromotionBonusProduct {

  /**
   * ID of the associated coupon, if applicable.
   */
  global String adjustmentBasisReference;

  /**
   * ID of the bonus product.
   */
  global String bonusProductId;

  /**
   * ID of the related promotion.
   */
  global String causeId;

  /**
   * List of qualifying cart items and their related quantity.
   */
  global List < ConnectApi.PromotionCartItemKey > qualifyingItems;

}