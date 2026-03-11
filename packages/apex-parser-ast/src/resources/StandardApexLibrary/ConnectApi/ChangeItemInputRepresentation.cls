/**
 * Change to an order item summary, such as a return or cancel. You specify whether to prorate the associated shipping charge based on the price change. The order item summary can’t be a shipping charge.
 */
global class ChangeItemInputRepresentation {

  /**
   * List of input data for fees associated with the order item being returned or canceled.
   */
  global List < ChangeItemFee > changeItemFees;

  /**
   * ID of the order item summary.
   */
  global String orderItemSummaryId;

  /**
   * Quantity to change. Use a positive value. For example, a value of 2 means “cancel or return 2 units.”
   */
  global Double quantity;

  /**
   * Reason for the change. The value must match one of the picklist values on the Reason field of the OrderItemSummaryChange object.
   */
  global String reason;

  /**
   * Reason text used for the return insights. The value has a max of 255 characters.
   */
  global String reasonForChangeText;

  /**
   * Specifies whether to prorate the shipping charge.
   */
  global Boolean shippingReductionFlag;

}