/**
 * A list of OrderItemSummaries to be fulfilled together, and the fulfillment location to handle them. The fulfillment type is one of the values defined for the Type field on the FulfillmentOrder object, such as “Warehouse” or “Retail Store.” The specified type is assigned to the FulfillmentOrder for this fulfillment group.
 */
global class FulfillmentGroupInputRepresentation {

  /**
   * ID of the fulfillment location.
   */
  global String fulfilledFromLocationId;

  /**
   * Fulfillment type. One of the Type field values defined for FulfillmentOrders.
   */
  global String fulfillmentType;

  /**
   * List of OrderItemSummaries.
   */
  global List < ConnectApi.OrderItemSummaryInputRepresentation > orderItemSummaries;

  /**
   * Reference to this input for use in troubleshooting failures. This value is only used by the APIs for creating fulfillment orders for multiple order delivery group summaries.
   */
  global String referenceId;

}