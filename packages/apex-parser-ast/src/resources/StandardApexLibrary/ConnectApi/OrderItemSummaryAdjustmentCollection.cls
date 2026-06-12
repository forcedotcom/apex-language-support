/**
 * Collection of adjustments for order item summaries.
 */
global class OrderItemSummaryAdjustmentCollection {

  global OrderItemSummaryAdjustmentCollection() {}

  /**
   * Order item summaries and their associated adjustments.
   */
  global Map < String , ConnectApi.OrderItemSummaryAdjustmentList > orderItemSummaries;

  global Object clone() {}

}