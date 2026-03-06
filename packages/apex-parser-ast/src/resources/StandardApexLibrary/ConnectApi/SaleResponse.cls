/**
 * Payment sale response.
 */
global class SaleResponse {

  /**
   * Error representation for the payment sale.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * Information from the payment gateway following the sale request.
   */
  global ConnectApi.SaleGatewayResponse gatewayResponse;

  /**
   * Information about the payment used in the sale request.
   */
  global ConnectApi.PaymentResponse payment;

  /**
   * Collection of responses from the gateway following the sale request.
   */
  global List < ConnectApi.GatewayLogResponse > paymentGatewayLogs;

  /**
   * Payment group used in the sale request.
   */
  global ConnectApi.PaymentGroupResponse paymentGroup;

  /**
   * Payment method used in the sale request.
   */
  global ConnectApi.PaymentMethodResponse paymentMethod;

}