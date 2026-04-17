/**
 * Adjustment aggregates associated with an order summary.
 */
global class OrderSummaryAdjustmentAggregates {

  /**
   * Indicates if adjustment aggregate values are available ( true ) or not ( false ).
   */
  global Boolean available;

  /**
   * Order summary adjustment aggregate job status. Values are: Failed —The adjustment aggregate data job for the order summary failed. InProgress —The adjustment aggregate data job for the order summary is in progress. NotInitiated —The adjustment aggregate data job for the order summary is not initiated. Submitted —The adjustment aggregate data job for the order summary is submitted.
   */
  global ConnectApi.OrderSummaryAdjustmentAggregatesStatus status;

  /**
   * Total distributed delivery promotion amounts associated with an order summary.
   */
  global String totalDeliveryPromotionDistAmount;

  /**
   * Total delivery promotion line amounts associated with an order summary.
   */
  global String totalDeliveryPromotionLineAmount;

  /**
   * Total delivery promotion amount associated with an order summary.
   */
  global String totalDeliveryPromotionTotalAmount;

  /**
   * Total distributed product promotion amounts associated with an order summary.
   */
  global String totalProductPromotionDistAmount;

  /**
   * Total product promotion line amount associated with an order summary.
   */
  global String totalProductPromotionLineAmount;

  /**
   * Total product promotion amount associated with an order summary.
   */
  global String totalProductPromotionTotalAmount;

}