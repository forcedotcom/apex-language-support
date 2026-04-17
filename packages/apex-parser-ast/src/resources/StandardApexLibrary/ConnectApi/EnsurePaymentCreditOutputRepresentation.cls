/**
 * A list of payment credits created from the credit memo with success status and error information. Shows all payment credits successfully issued to the customer's payment methods and any errors encountered during processing.
 */
global class EnsurePaymentCreditOutputRepresentation {

  /**
   * The list of payment credits that were created.
   */
  global List < ConnectApi.PaymentCreditOutputRepresentation > paymentCredits;

}