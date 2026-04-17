/**
 * The order payment summary ID and amount of the processed refund items.
 */
global class RefundSequenceItemOutputRepresentation {

  /**
   * The amount that was refunded.
   */
  global Double amount;

  /**
   * The order payment summary’s ID.
   */
  global String orderPaymentSummaryId;

}