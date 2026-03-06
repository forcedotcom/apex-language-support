/**
 * The sequence for refunds and payment credits.
 */
global class AbstractBaseSequenceInputRepresentation {

  /**
   * The amount being refunded.
   */
  global Double amount;

  /**
   * The order payment summary’s ID.
   */
  global String orderPaymentSummaryId;

}