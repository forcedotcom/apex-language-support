/**
 * A list of responses for the individual FulfillmentOrder creation attempts from a request to create multiple fulfillment orders.
 */
global class MultipleFulfillmentOrderOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  global MultipleFulfillmentOrderOutputRepresentation() {}

  /**
   * A list of response data for created and failed FulfillmentOrders.
   */
  global List < ConnectApi.FulfillmentGroupOutputRepresentation > fulfillmentOrders;

  global Object clone() {}

}