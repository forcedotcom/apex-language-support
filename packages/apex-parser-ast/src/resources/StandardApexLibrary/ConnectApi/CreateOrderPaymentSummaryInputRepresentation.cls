/**
 * An OrderSummary for which to create an OrderPaymentSummary, with the payment authorization or payments to include in it.
 */
global class CreateOrderPaymentSummaryInputRepresentation {

  global CreateOrderPaymentSummaryInputRepresentation() {}

  /**
   * ID of the OrderSummary.
   */
  global String orderSummaryId;

  /**
   * Name of the OrderPaymentSummary.
   */
  global String name;

  /**
   * ID of the payment authorization.
   */
  global String paymentAuthorizationId;

  /**
   * List of IDs of the payments.
   */
  global List < String > paymentIds;

  global Object clone() {}

}