/**
 * Price adjustments applied to a cart item.
 */
global class PromotionCartItemPriceAdjustment {

  /**
   * Scope of the price adjustment amount. Values are: Total —The adjustment scope is the total price. Unit —The adjustment scope is the unit price. UnproratedTotal —The adjustment scope is the unprorated total price.
   */
  global ConnectApi.AdjustmentAmountScope adjustmentAmountScope;

  /**
   * ID of the associated coupon, if applicable.
   */
  global String adjustmentBasisReference;

  /**
   * Description of the adjustment.
   */
  global String adjustmentDescription;

  /**
   * Level of the promotion target. Values are: Cart —The target is cart-level. Item —The target is item-level.
   */
  global ConnectApi.CartPromotionType adjustmentTargetType;

  /**
   * How the price adjustment amount is calculated. Values are: AdjustmentAmount —The adjustment is a fixed amount. AdjustmentPercentage —The adjustment is a percentage.
   */
  global ConnectApi.AdjustmentType adjustmentType;

  /**
   * Value of the price adjustment.
   */
  global String adjustmentValue;

  /**
   * Total adjustment amount.
   */
  global String baseAmount;

  /**
   * ID of the associated cart adjustment group.
   */
  global String cartAdjustmentGroupId;

  /**
   * ID of the associated cart item.
   */
  global String cartItemId;

  /**
   * ID of the cart item price adjustment.
   */
  global String id;

  /**
   * ID of the associated promotion.
   */
  global String priceAdjustmentCauseId;

  /**
   * Where in the sequence of adjustments this adjustment was applied.
   */
  global Integer priority;

}