/**
 * Adjustment for a cart delivery method in a promotion.
 */
global class PromotionCartDeliveryMethodAdjustment {

  /**
   * Type of price adjustment. Valid values are: AdjustmentAmount —The adjustment is a fixed amount. AdjustmentPercentage —The adjustment is a percentage.
   */
  global String adjustmentType;

  /**
   * Price value of the adjustment.
   */
  global String adjustmentValue;

  /**
   * Price value of the adjustment.
   */
  global String baseAmount;

  /**
   * ID of the related promotion.
   */
  global String priceAdjustmentCauseId;

  /**
   * Where in the sequence of adjustments this adjustment was applied.
   */
  global Integer priority;

}