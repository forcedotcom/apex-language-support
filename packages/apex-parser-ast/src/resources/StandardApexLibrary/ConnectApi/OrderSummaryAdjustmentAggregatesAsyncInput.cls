/**
 * Order summary IDs for calculating adjustment aggregates.
 */
global class OrderSummaryAdjustmentAggregatesAsyncInput {

  global OrderSummaryAdjustmentAggregatesAsyncInput() {}

  /**
   * List of order summary IDs.
   */
  global List < String > orderSummaryIds;

  global Object clone() {}

}