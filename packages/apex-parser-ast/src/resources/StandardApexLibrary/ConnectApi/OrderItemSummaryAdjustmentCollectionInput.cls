/**
 * Collection of order item summaries.
 */
global class OrderItemSummaryAdjustmentCollectionInput {

  global OrderItemSummaryAdjustmentCollectionInput() {}

  /**
   * List of order item summaries.
   */
  global List < ConnectApi.OrderItemSummaryAdjustmentInput > orderItemSummaries;

  global Object clone() {}

}