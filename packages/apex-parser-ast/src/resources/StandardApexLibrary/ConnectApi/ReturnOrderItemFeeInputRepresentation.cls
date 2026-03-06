/**
 * ID of a ReturnOrderLineItem representing a return fee, and instructions for updating it. After the update, the ReturnOrderLineItem is read-only. Any remaining quantity of the fee to be processed is added to a new ReturnOrderLineItem.
 */
global class ReturnOrderItemFeeInputRepresentation {

  /**
   * Quantity of the ReturnOrderLineItem to process. When the fee is a fixed amount, the charge is determined by multiplying the total fee amount by this value divided by the expected quantity. For example, if the fee amount is $10 and the expected quantity is 2, then if the quantityReturned is 1, $5 is charged. This value normally equals the quantity returned of the ReturnOrderLineItem for the returned item that the fee applies to. The value must be greater than zero. If this value plus quantityToCancel is less than the expected quantity, then the remaining quantity to be returned is added to a new ReturnOrderLineItem.
   */
  global Double quantityReturned;

  /**
   * Quantity of the ReturnOrderLineItem to remove. This value normally equals the quantity canceled of the ReturnOrderLineItem for the returned item that the fee applies to. This value can also be used to cancel a portion of the fee. The value must be zero or greater. If this value plus quantityReturned is less than the expected quantity, then the remaining quantity to be returned is added to a new ReturnOrderLineItem.
   */
  global Double quantityToCancel;

  /**
   * ID of the ReturnOrderLineItem representing the return fee.
   */
  global String returnOrderLineItemId;

}