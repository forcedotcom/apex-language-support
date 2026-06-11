/**
 * List of inputs for creating fulfillment orders.
 */
global class MultipleFulfillmentOrderInputRepresentation {

  global MultipleFulfillmentOrderInputRepresentation() {}

  /**
   * Each element contains the data to create one fulfillment order.
   */
  global List < ConnectApi.FulfillmentOrderInputRepresentation > fulfillmentOrders;

  global Object clone() {}

}