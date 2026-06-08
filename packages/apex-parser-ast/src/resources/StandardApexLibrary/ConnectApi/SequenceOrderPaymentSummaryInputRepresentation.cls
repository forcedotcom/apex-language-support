/**
 * Amount to apply to specified OrderPaymentSummary as part of a payment or refund.
 */
global class SequenceOrderPaymentSummaryInputRepresentation {

  global SequenceOrderPaymentSummaryInputRepresentation() {}

  /**
   * Amount to apply to the OrderPaymentSummary.
   */
  global Double amount;

  /**
   * ID of the OrderPaymentSummary to apply the Amount to.
   */
  global String orderPaymentSummaryId;

  global Object clone() {}

}