/**
 * A list of FulfillmentOrderLineItems and quantities to cancel.
 */
global class FulfillmentOrderLineItemsToCancelInputRepresentation {

  global FulfillmentOrderLineItemsToCancelInputRepresentation() {}

  /**
   * List of FulfillmentOrderLineItems and quantities.
   */
  global List < ConnectApi.FulfillmentOrderLineItemInputRepresentation > fulfillmentOrderLineItemsToCancel;

  global Object clone() {}

}