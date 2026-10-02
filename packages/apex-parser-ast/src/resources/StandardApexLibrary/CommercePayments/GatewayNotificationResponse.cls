/**
 * When the payment gateway sends a notification to the payments platform, the platform responds with a GatewayNotificationResponse indicating whether the platform succeeded or failed at receiving the notification.
 * <p>Usage
 * You must specify the CommercePayments namespace when creating an instance of this class. The constructor of this class takes no arguments. For example:
 * CommercePayments.GatewayNotificationResponse gnr = new CommercePayments.GatewayNotificationResponse();
 * When an asynchronous payment gateway sends a notification, the gateway requires the platform to acknowledge that it has either succeeded or failed in receiving the notification. Payment gateway adapters use this class to construct the acknowledgment response, which gateways expect for a notification. GatewayNotificationResponse is the return type of the processNotification method.
 * <p>Example
 * commercepayments.GatewayNotificationResponse gnr = new commercepayments.GatewayNotificationResponse();
 * if (saveResult.isSuccess()) {
 *     system.debug('Notification accepted by platform');
 * } else {
 *     system.debug('Errors in the result '+ Blob.valueOf(saveResult.getErrorMessage()));
 * }
 * gnr.setStatusCode(200);
 * gnr.setResponseBody(Blob.valueOf('[accepted]'));
 * return gnr;
 */
global class GatewayNotificationResponse {
    global Object GatewayNotificationResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the body of the response to the gateway. Some gateways expect the payments platform to acknowledge the notification with a response regardless of whether the notification was accepted.
     */
    global void setResponseBody(Blob responseBody) { }

    /**
     * Sets the HTTP status code sent to the gateway as part of the payments platform’s response notification.
     */
    global void setStatusCode(Integer statusCode) { }

    global override virtual String toString() { return null; }
}