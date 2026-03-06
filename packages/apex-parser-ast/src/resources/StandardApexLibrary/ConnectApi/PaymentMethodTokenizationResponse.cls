/**
 * Payment method tokenization output representation.
 */
global class PaymentMethodTokenizationResponse {

  /**
   * Error representation for the payment method tokenization process. Sent only if the tokenization process encounters an error in the gateway.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * Response containing the tokenized payment method value from the payment gateway.
   */
  global ConnectApi.PaymentMethodTokenizationGatewayResponse gatewayResponse;

  /**
   * Logs showing more details about the tokenization process that occurred in the gateway.
   */
  global List < ConnectApi.GatewayLogResponse > paymentGatewayLogs;

  /**
   * Object representation of the payment method object that was tokenized.
   */
  global ConnectApi.PaymentMethodResponse paymentMethod;

}