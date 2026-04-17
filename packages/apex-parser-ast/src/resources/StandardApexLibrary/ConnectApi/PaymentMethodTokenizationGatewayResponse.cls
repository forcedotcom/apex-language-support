/**
 * Payment method tokenization gateway response representation.
 */
global class PaymentMethodTokenizationGatewayResponse extends ConnectApi.AbstractGatewayResponse {

  /**
   * The payment method token sent from the gateway.
   */
  global String gatewayToken;

}