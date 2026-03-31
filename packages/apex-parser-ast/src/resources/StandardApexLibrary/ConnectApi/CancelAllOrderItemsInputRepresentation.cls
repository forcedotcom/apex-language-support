/**
 * Cancellation of all items in an order.
 */
global class CancelAllOrderItemsInputRepresentation {

  /**
   * List of input data for fees, including taxes, associated with the order items being canceled.
   */
  global List < ConnectApi.ChangeItemFeeWithTaxInputRepresentation > changeItemFees;

  /**
   * List of items excluded from cancellation.
   */
  global List < String > excludedItems;

  /**
   * Reason for the cancellation. The value must match one of the picklist values on the Reason field of the Order Product Summary Change object.
   */
  global String reason;

  /**
   * Reason text used for the return insights. The value has a max of 255 characters.
   */
  global String reasonText;

}