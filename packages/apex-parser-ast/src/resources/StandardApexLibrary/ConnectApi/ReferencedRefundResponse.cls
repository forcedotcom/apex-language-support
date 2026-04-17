/**
 * Refund comprehensive output.
 */
global class ReferencedRefundResponse {

  /**
   * Error response representation for the refund.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * Gateway response received for the processed refund request.
   */
  global ConnectApi.RefundGatewayResponse gatewayResponse;

  /**
   * Gateway log collection representation for the refund.
   */
  global List < ConnectApi.GatewayLogResponse > paymentGatewayLogs;

  /**
   * Payment group associated with the refund.
   */
  global ConnectApi.PaymentGroupResponse paymentGroup;

  /**
   * Refund response representation.
   */
  global ConnectApi.RefundResponse refund;

}