/**
 * Qualifier for a promotion with an approaching discount.
 */
global class PromotionApproachingDiscount {

  /**
   * ID of the promotion with an approaching discount.
   */
  global String promotionId;

  /**
   * Qualifying amount when promotion is applied.
   */
  global String qualifyingAmount;

  /**
   * Qualifying product total.
   */
  global String qualifyingProductTotal;

  /**
   * Target type of a promotion discount. Shipping —Promotion discounts shipping amount. Transaction —Promotion discounts total transaction amount.
   */
  global ConnectApi.TargetType targetType;

}