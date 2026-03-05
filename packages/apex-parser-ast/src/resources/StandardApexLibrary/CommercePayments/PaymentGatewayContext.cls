/**
 * Wraps the information related to a payment request.
 */
global class PaymentGatewayContext {

  global PaymentGatewayContext(commercepayments.PaymentGatewayRequest request, String requestType) {}

  /**
   * Returns the payment request object.
   * @return commercepayments.PaymentGatewayRequest
   */
  global commercepayments.PaymentGatewayRequest getPaymentRequest() {}

  /**
   * Returns the payment request type.
   * @return String
   */
  global String getPaymentRequestType() {}

}