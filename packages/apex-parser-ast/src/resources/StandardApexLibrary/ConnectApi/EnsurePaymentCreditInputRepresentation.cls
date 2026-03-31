/**
 * The credit memo information and, optionally, the payment sequence details for issuing credits. The credit memo amount is distributed to the payment methods specified in the payment sequence until the amount is fully applied. If you don’t specify a payment sequence, the default payment sequence for Ensure Payment is used.
 */
global class EnsurePaymentCreditInputRepresentation {

  /**
   * The credit memo that’s being credited.
   */
  global CreditMemoInputRepresentation creditMemo;

  /**
   * The ordering sequence of payments being used for the payment credit application.
   */
  global List < ConnectApi.PaymentCreditSequenceInputRepresentation > paymentCreditSequence;

}