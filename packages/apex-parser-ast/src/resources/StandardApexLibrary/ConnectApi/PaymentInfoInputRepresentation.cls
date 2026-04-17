/**
 * Payment information about additional funds required for an order.
 */
global class PaymentInfoInputRepresentation {

  /**
   * Last payment gateway log ID for the new order payment summary.
   */
  global String lastPaymentGatewayLogId;

  /**
   * Overrides the default name of the order payment summary created.
   */
  global String name;

  /**
   * Payment authorization ID to be used if needed to fund the exchange order.
   */
  global String paymentAuthorizationId;

  /**
   * Payment IDs for the new order payment summary.
   */
  global List < String > paymentIds;

  /**
   * Payment method ID for the new order payment summary.
   */
  global String paymentMethodId;

}