/**
 * The payment credit sequence, credit types, and refund sequence that provide information for optimal refund processing.
 */
global class RefundInstructionsHintInputRepresentation {

  /**
   * The Order Payment Summary ID, credit amount, and credit type for individual payment credit items. Each item represents a specific payment method and the amount of credit to be applied to it.
   */
  global List < ConnectApi.PaymentCreditSequenceItemInputRepresentation > paymentCreditSequenceItems;

  /**
   * The Order Payment Summary ID and amount for the individual refund items in a sequence. Each item has a payment method and refund amount to be processed for that method.
   */
  global List < ConnectApi.RefundSequenceItemInputRepresentation > refundSequenceItems;

}