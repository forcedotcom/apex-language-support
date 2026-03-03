/**
 * Contains the notification request data from the gateway.
 */
global class PaymentGatewayNotificationRequest {

  /**
   * Gets HTTP headers from the notification request sent by the payment gateway.
   * @return Map< String , String >
   */
  global Map< String , String > getHeaders() {}

  /**
   * Stores the notification request body information from the payment gateway’s notification request.
   * @return Blob
   */
  global Blob getRequestBody() {}

}