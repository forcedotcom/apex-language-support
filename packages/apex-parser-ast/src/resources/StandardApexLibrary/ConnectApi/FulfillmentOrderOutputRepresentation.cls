/**
 * A list of IDs of the created FulfillmentOrders.
 */
global class FulfillmentOrderOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  global FulfillmentOrderOutputRepresentation() {}

  /**
   * A list of IDs of created Fulfillment Orders.
   */
  global List < String > fulfillmentOrderIds;

  global Object clone() {}

}