/**
 * Details of an OrderItemSummary from a failed FulfillmentOrder in a create multiple fulfillment orders request.
 */
global class OrderItemSummaryOutputRepresentation {

  /**
   * List of errors specific to the OrderItemSummary, if any.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * ID of the OrderItemSummary.
   */
  global String orderItemSummaryId;

  /**
   * Quantity of the OrderItemSummary.
   */
  global Double quantity;

}