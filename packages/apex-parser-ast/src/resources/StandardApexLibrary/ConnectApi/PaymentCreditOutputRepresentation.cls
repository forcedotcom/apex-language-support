/**
 * The payment credit ID, amount, and order payment summary ID for a newly created payment credit. Represents a single credit transaction that was applied to a specific payment method with the generated credit ID for tracking.
 */
global class PaymentCreditOutputRepresentation {

  /**
   * The amount in the payment credit.
   */
  global Double amount;

  /**
   * The order payment summary’s ID.
   */
  global String orderPaymentSummaryId;

  /**
   * The created payment credit’s ID.
   */
  global String paymentCreditId;

}