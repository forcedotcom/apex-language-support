/**
 * Contains the notification request data from the gateway.
 * <p>Usage
 * When the payment gateway sends a notification for a payment request, the payments platform sends the notification request to the gateway adapter. If the notification payload contains an eventCode of CAPTURE, the adapter constructs a CaptureNotification. If the notification payload contains an eventCode of REFUND, the adapter constructs a ReferencedRefundNotification. If the notification payload contains eventCode of AUTHORISATION, the adapter constructs a GatewayNotificationResponse.
 * You can obtain a notification request from PaymentGatewayNotificationContext by invoking its getPaymentGatewayNotificationRequest method.
 * <p>Example
 * global commercepayments.GatewayNotificationResponse
 *     processNotification(commercepayments.PaymentGatewayNotificationContext gatewayNotificationContext) {
 *         commercepayments.PaymentGatewayNotificationRequest notificationRequest = gatewayNotificationContext.getPaymentGatewayNotificationRequest();
 * }
 */
global class PaymentGatewayNotificationRequest {
    global PaymentGatewayNotificationRequest(Map headers, String requestBody) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Gets HTTP headers from the notification request sent by the payment gateway.
     */
    global Map getHeaders() { return null; }

    /**
     * Stores the notification request body information from the payment gateway’s notification request.
     */
    global Blob getRequestBody() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}