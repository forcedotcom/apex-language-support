/**
 * Data about products and delivery charges to return, as well as associated return fees.
 */
global class ReturnItemsInputRepresentation {

  /**
   * The payment credit sequence, credit types, and refund sequence that provide information for optimal refund processing.
   */
  global List < ConnectApi.RefundInstructionsHintInputRepresentation > refundInstructionsHint;

  /**
   * List of ReturnOrderLineItems to return that represent delivery charges.
   */
  global List < ConnectApi.ReturnOrderItemDeliveryChargeInputRepresentation > returnOrderItemDeliveryCharges;

  /**
   * List of ReturnOrderLineItems to process that represent return fees.
   */
  global List < ConnectApi.ReturnOrderItemFeeInputRepresentation > returnOrderItemFees;

  /**
   * List of ReturnOrderLineItems to process that represent products, along with data about how to process them.
   */
  global List < ConnectApi.ReturnOrderItemInputRepresentation > returnOrderItems;

}