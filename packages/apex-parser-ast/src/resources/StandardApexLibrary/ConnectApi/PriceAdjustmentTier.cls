/**
 * Price adjustment tier.
 */
global class PriceAdjustmentTier {

  /**
   * Type of price adjustment for the tier. Values are: AmountBasedAdjustment —Price is adjusted by a specified amount. PercentageBasedAdjustment —Price is adjusted by a specified percentage.
   */
  global ConnectApi.PriceAdjustmentTierType adjustmentType;

  /**
   * Adjustment value of the tier.
   */
  global String adjustmentValue;

  /**
   * ID of the price adjustment tier.
   */
  global String id;

  /**
   * Lower limit of the tier.
   */
  global String lowerBound;

  /**
   * Unit price of the tier.
   */
  global String tierUnitPrice;

  /**
   * Upper limit of the tier.
   */
  global String upperBound;

}