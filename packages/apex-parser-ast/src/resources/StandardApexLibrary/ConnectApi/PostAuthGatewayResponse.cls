/**
 * Gateway response after confirmation that the merchant is ready to capture payment of an existing pre-authorized transaction.
 */
global class PostAuthGatewayResponse {

  /**
   * Code used to authorize the payment that the payment gateway is processing.
   */
  global String gatewayAuthorizationCode;

  /**
   * Details about the payment method.
   */
  global ConnectApi.PaymentMethodDetails paymentMethodDetails;

}