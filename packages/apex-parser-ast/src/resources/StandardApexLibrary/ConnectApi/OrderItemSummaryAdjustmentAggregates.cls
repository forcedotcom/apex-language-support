/**
 * Adjustment aggregates associated with an order item summary.
 */
global class OrderItemSummaryAdjustmentAggregates {

  /**
   * Indicates whether adjustment aggregates are available ( true ) or not ( false ).
   */
  global Boolean available;

  /**
   * Order summary adjustment aggregate job status. Failed —The adjustment aggregate data job for the order summary failed. InProgress —The adjustment aggregate data job for the order summary is in progress. NotInitiated —The adjustment aggregate data job for the order summary is not initiated. Submitted —The adjustment aggregate data job for the order summary is submitted.
   */
  global ConnectApi.OrderSummaryAdjustmentAggregatesStatus status;

  /**
   * Total of all line item promotions applied to this specific product.
   */
  global String totalLinePromotionAmount;

  /**
   * Total of all order level promotions applied to this specific product.
   */
  global String totalPromotionDistAmount;

}