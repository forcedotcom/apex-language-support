/**
 * Authorization Reversal output representation.
 */
global class AuthorizationReversalResponse {

  /**
   * Error response representation for the authorization reversal.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * Gateway response representation for authorization reversal.
   */
  global ConnectApi.AuthReversalGatewayResponse gatewayResponse;

  /**
   * Payment authorization adjustment response representation for the authorization reversal.
   */
  global ConnectApi.PaymentAuthAdjustmentResponse paymentAuthAdjustment;

  /**
   * Gateway log collection representation for the authorization reversal.
   */
  global List < ConnectApi.GatewayLogResponse > paymentGatewayLogs;

}