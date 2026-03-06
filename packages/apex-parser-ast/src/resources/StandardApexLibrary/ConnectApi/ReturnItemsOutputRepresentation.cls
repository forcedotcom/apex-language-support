/**
 * Output of Return Items. Includes the ID of the generated change order for items and delivery charges being returned, as well as the ID of the generated change order for any charged return fees. Also includes information about any ReturnOrderLineItems that were created to represent remaining return quantities.
 */
global class ReturnItemsOutputRepresentation {

  /**
   * ID of the change order created by processing the ReturnOrderLineItems representing returned items and delivery charges. Use this change order to create a credit memo.
   */
  global String changeOrderId;

  /**
   * ID of the change order created by processing the ReturnOrderLineItems representing return fees. Use this change order to create an invoice.
   */
  global String feeChangeOrderId;

  /**
   * Stores a JSON representation of the payment credit and refund sequences for ensure credit and ensure refund.
   */
  global String RefundInstructionsHint;

  /**
   * List of properties representing any remaining quantities from partial returns processed by this call. It includes order items, delivery charges, and return fees. Each element of the list includes the ID of a split ReturnOrderLineItem and the ID of the partially processed ReturnOrderLineItem whose remaining quantity it holds.
   */
  global List < ConnectApi.ReturnOrderItemSplitLineOutputRepresentation > returnLineItemSplits;

}