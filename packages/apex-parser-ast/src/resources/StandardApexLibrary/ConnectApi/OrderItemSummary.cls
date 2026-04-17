/**
 * Order item summary.
 */
global class OrderItemSummary {

  /**
   * Adjustment aggregates associated with an order item summary.
   */
  global ConnectApi.OrderItemSummaryAdjustmentAggregates adjustmentAggregates;

  /**
   * Map of fields from order item summary and other related objects that were queried.
   */
  global Map < String , ConnectApi.RecordField > fields;

  /**
   * ID of the order item summary.
   */
  global String orderItemSummaryId;

  /**
   * ID of the order summary.
   */
  global String orderSummaryId;

  /**
   * Associated product item information.
   */
  global ConnectApi.OrderItemSummaryProduct product;

}