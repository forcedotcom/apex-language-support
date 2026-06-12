/**
 * Price adjustment schedule.
 */
global class PriceAdjustmentSchedule {

  global PriceAdjustmentSchedule() {}

  /**
   * ID of the price adjustment schedule.
   */
  global String id;

  /**
   * List of price adjustment tiers.
   */
  global List < ConnectApi.PriceAdjustmentTier > priceAdjustmentTiers;

  global Object clone() {}

}