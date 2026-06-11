/**
 * Representation for list of adjustments for an Order Item Summary.
 */
global class OrderItemSummaryAdjustmentList {

  global OrderItemSummaryAdjustmentList() {}

  /**
   * Adjustments associated with an order item summary.
   */
  global List < ConnectApi.OrderSummaryAdjustment > adjustments;

  global Object clone() {}

}