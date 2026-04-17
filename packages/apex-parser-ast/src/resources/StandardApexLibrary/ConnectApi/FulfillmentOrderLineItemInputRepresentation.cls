/**
 * A FulfillmentOrderLineItem and quantity to cancel. You can cancel less than the full quantity, in which case you reallocate the canceled quantity to a different FulfillmentOrder.
 */
global class FulfillmentOrderLineItemInputRepresentation {

  /**
   * ID of the FulfillmentOrderLineItem.
   */
  global String fulfillmentOrderLineItemId;

  /**
   * Quantity to cancel.
   */
  global Double quantity;

}