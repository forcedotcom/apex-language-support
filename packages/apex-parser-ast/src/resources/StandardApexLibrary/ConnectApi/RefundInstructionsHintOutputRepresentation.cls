/**
 * Instructions showing the sequence in which credits and refunds were issued to the customer.
 */
global class RefundInstructionsHintOutputRepresentation {

  /**
   * The representation of individual payment credit items. Each item represents a specific payment method and the amount of credit to be applied to it.
   */
  global List < ConnectApi.PaymentCreditSequenceItemOutputRepresentation > paymentCreditSequence;

  /**
   * The order payment summary ID and value of the processed refund items.
   */
  global List < ConnectApi.RefundSequenceItemOutputRepresentation > refundSequence;

}