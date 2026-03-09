/**
 * Information about one FulfillmentOrder from a request to create fulfillment orders from multiple OrderDeliveryGroupSummaries. If the FulfillmentOrder was created, then its ID is returned. If it failed, then data from the input is returned so you can resubmit it.
 */
global class FulfillmentGroupOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  /**
   * (Creation failed) The input FulfilledFromLocationId.
   */
  global String fulfilledFromLocationId;

  /**
   * The FulfillmentOrderId from the successfully created FulfillmentOrder.
   */
  global String fulfillmentOrderId;

  /**
   * (Creation failed) The input FulfillmentType.
   */
  global String fulfillmentType;

  /**
   * (Creation failed) The input OrderDeliveryGroupSummaryId.
   */
  global String orderDeliveryGroupSummaryId;

  /**
   * (Creation failed) The input list of OrderItemSummaries.
   */
  global List < ConnectApi.OrderItemSummaryOutputRepresentation > orderItemSummaries;

  /**
   * (Creation failed) The input OrderSummaryId.
   */
  global String orderSummaryId;

  /**
   * The referenceId from the FulfillmentGroup input representation. Use this value to troubleshoot a failure.
   */
  global String referenceId;

}