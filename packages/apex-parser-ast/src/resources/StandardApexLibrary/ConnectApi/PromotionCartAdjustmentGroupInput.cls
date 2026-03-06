/**
 * Cart adjustment group for a promotion.
 */
global class PromotionCartAdjustmentGroupInput {

  /**
   * ID of the associated coupon, if applicable.
   */
  global String adjustmentBasisReference;

  /**
   * Description of the price adjustment.
   */
  global String adjustmentDescription;

  /**
   * Type of price adjustment. Valid values are: AdjustmentAmount —The adjustment is a fixed amount. AdjustmentPercentage —The adjustment is a percentage.
   */
  global ConnectApi.AdjustmentType adjustmentType;

  /**
   * Price value of the adjustment.
   */
  global String adjustmentValue;

  /**
   * Total amount of the adjustment.
   */
  global String baseAmount;

  /**
   * ID of the cart.
   */
  global String cartId;

  /**
   * ID of the cart adjustment group.
   */
  global String id;

  /**
   * ID of the related promotion.
   */
  global String priceAdjustmentCauseId;

  /**
   * Where in the sequence of adjustments this adjustment was applied.
   */
  global Integer priority;

}