/**
 * When the payment gateway sends a notification to the payments platform, the platform responds with a GatewayNotificationResponse indicating whether the platform succeeded or failed at receiving the notification.
 */
public class GatewayNotificationResponse {

  /**
   * Sets the body of the response to the gateway. Some gateways expect the payments platform to acknowledge the notification with a response regardless of whether the notification was accepted.
   * @param responseBody Common response values include accepted for successfully receiving the response. For example: commercepayments.GatewayNotificationResponse gnr = new commercepayments.GatewayNotificationResponse(); if (saveResult.isSuccess()) { system.debug( 'Notification accepted by platform' ); } else { system.debug( 'Errors in the result ' + Blob .valueOf(saveResult.getErrorMessage())); } gnr.setStatusCode(200); gnr.setResponseBody( Blob .valueOf( '[accepted]' )); return gnr;
   */
  public void setResponseBody(Blob responseBody) {}

  /**
   * Sets the HTTP status code sent to the gateway as part of the payments platform’s response notification.
   * @param statusCode The status code will vary based on the type of payments platform response. Users should configure their GatewayNotificationResponse class to account for all values that their payments platform can possibly return. For example: commercepayments.GatewayNotificationResponse gnr = new commercepayments.GatewayNotificationResponse(); if (saveResult.isSuccess()) { system.debug( 'Notification accepted by platform' ); } else { system.debug( 'Errors in the result ' + Blob .valueOf(saveResult.getErrorMessage())); } gnr.setStatusCode(200); gnr.setResponseBody( Blob .valueOf( '[accepted]' )); return gnr;
   */
  public void setStatusCode(Integer statusCode) {}

}