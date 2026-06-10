/**
 * Shared order payment summary sequence.
 */
global class SharedOrderPaymentSummarySequenceInputRepresentation {

  global SharedOrderPaymentSummarySequenceInputRepresentation() {}

  /**
   * Shared order payment summary ID.
   */
  global String orderPaymentSummaryId;

  /**
   * Balance amount to be reserved.
   */
  global Double reservedBalanceAmount;

  global Object clone() {}

}