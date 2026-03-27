/**
 * Price adjustment schedule.
 */
global class PriceAdjustmentSchedule {

  /**
   * ID of the price adjustment schedule.
   */
  global String id;

  /**
   * List of price adjustment tiers.
   */
  global List < ConnectApi.PriceAdjustmentTier > priceAdjustmentTiers;

}