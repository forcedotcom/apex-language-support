/**
 * Order summary lookup input.
 */
global class OrderSummaryLookupInput {

  global OrderSummaryLookupInput() {}

  /**
   * Either the order summary ID or reference number value.
   */
  global String orderSummaryIdOrRefNumber;

  /**
   * Verification attributes for guest shoppers.
   */
  global ConnectApi.OrderSummaryVerificationInput verification;

  global Object clone() {}

}