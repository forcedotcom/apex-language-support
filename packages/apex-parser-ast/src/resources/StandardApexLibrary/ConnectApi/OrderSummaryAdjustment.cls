/**
 * Adjustment associated with an order summary.
 */
global class OrderSummaryAdjustment {

  /**
   * Amount associated with the adjustment.
   */
  global String amount;

  /**
   * Display name for secondary cause of the adjustment (for example, Null or the CouponCode that’s associated with a Coupon)
   */
  global String basisReferenceDisplayName;

  /**
   * Three-letter ISO 4217 currency code associated with the adjustment.
   */
  global String currencyIsoCode;

  /**
   * Display name for the primary cause of the adjustment (for example, Display name of the Promotion)
   */
  global String displayName;

  /**
   * Type of price adjustment in promotions. Values are: SplitLine —Price adjustment on an order item. Header —Price adjustment on the entire order.
   */
  global ConnectApi.OrderSummaryAdjustmentTargetType targetType;

  /**
   * Type of adjustment (for example, Promotion, Other).
   */
  global String type;

}