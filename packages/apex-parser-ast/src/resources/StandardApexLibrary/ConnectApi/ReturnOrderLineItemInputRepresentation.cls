/**
 * Data for creating a ReturnOrderLineItem for an order item being returned, including data to create ReturnOrderLineItems representing any return fees associated with it.
 */
global class ReturnOrderLineItemInputRepresentation {

  /**
   * Whether to refund any associated shipping charge.
   */
  global Boolean canReduceShipping;

  /**
   * ID of the associated OrderItemSummary. If the OrderItemSummary already has an associated ReturnOrderLineItem, then you must specify a different reasonForReturn . Duplicating the reason breaks the financial calculations.
   */
  global String orderItemSummaryId;

  /**
   * Quantity expected to be returned. This value also applies to any fees specified in returnOrderLineItemFees .
   */
  global Double quantityExpected;

  /**
   * Quantity already physically returned.
   */
  global Double quantityReceived;

  /**
   * Reason for the return. The value must match an entry in both the OrderSummaryChange Reason field and the ReturnOrderLineItem object’s ReasonForReturn picklist.
   */
  global String reasonForReturn;

  /**
   * List of input data for return fees associated with the order item being returned. A ReturnOrderLineItem of Type Fee is created to represent each fee.
   */
  global List < ConnectApi.ReturnOrderLineItemFeeInputRepresentation > returnOrderLineItemFees;

}