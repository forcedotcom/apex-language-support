/**
 * Payment method tokenization gateway response representation.
 */
global class PaymentMethodTokenizationGatewayResponse extends ConnectApi.AbstractGatewayResponse {

  global PaymentMethodTokenizationGatewayResponse() {}

  /**
   * The payment method token sent from the gateway.
   */
  global String gatewayToken;

  global Object clone() {}

}