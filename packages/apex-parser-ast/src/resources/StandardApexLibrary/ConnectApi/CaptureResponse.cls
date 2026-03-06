/**
 * Capture output.
 */
global class CaptureResponse {

  /**
   * Error response representation for an authorization capture.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * Gateway log response containing details about gateway logs created during the process of the capture request.
   */
  global ConnectApi.CaptureGatewayResponse gatewayResponse;

  /**
   * Payment response object for the capture request. Contains the information related to a payment object created during request processing.
   */
  global ConnectApi.PaymentResponse payment;

  /**
   * Gateway log collection for an authorization capture.
   */
  global List < ConnectApi.GatewayLogResponse > paymentGatewayLogs;

  /**
   * Payment group associated with the capture request.
   */
  global ConnectApi.PaymentGroupResponse paymentGroup;

}