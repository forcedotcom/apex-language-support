/**
 * Wraps the information related to a gateway notification.
 */
global class PaymentGatewayNotificationContext {

  global PaymentGatewayNotificationContext() {}

  /**
   * Returns the payment gateway’s notification request.
   * @return commercepayments.PaymentGatewayNotificationRequest
   */
  global commercepayments.PaymentGatewayNotificationRequest getPaymentGatewayNotificationRequest() {}

  global Object clone() {}

}