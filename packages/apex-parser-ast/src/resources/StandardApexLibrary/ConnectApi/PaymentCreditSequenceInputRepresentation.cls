/**
 * The order in which the credit amount is applied to specified payment methods. The sequence determines the order that the credit is applied to each payment during processing. The amount credited to each payment method is determined in each order payment summary.
 */
global class PaymentCreditSequenceInputRepresentation {

  /**
   * The amount of the payment credit.
   */
  global Double amount;

  /**
   * The type of credit to be used. This value is based on the Credit Type field of the Payment Credit Transaction, which is customizable.
   */
  global String creditType;

  /**
   * An ordered list of payment summaries that determines what payment methods the amount is credited to and in what order.
   */
  global String orderPaymentSummaryId;

}