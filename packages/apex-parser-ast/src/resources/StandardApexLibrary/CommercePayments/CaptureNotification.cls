/**
 * When a payment gateway sends a notification for a capture transaction, the payment gateway adapter creates the CaptureNotification object to store information about the notification.
 * <p>Usage
 * CaptureNotification is used in asynchronous payment gateway adapters.
 * Specify the CommercePayments namespace when creating an instance of this class. The constructor of this class takes no arguments. For example:
 * CommercePayments.CaptureNotification crn = new CommercePayments.CaptureNotification();
 * <p>Example
 * commercepayments.BaseNotification notification = null;
 *         if ('CAPTURE'.equals(eventCode)) {
 *             notification = new commercepayments.CaptureNotification();
 *         } else if ('REFUND'.equals(eventCode)) {
 *             notification = new commercepayments.ReferencedRefundNotification();
 *         }
 */
global with sharing class CaptureNotification extends commercepayments.BaseNotification {
    global CaptureNotification() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the transaction amount. Must be a non-negative value.
     */
    global override void setAmount(Double amount) { }

    /**
     * Sets the AVS (address verification system) result code that the gateway returned. Maximum length of 64 characters.
     */
    global void setGatewayAvsCode(String gatewayAvsCode) { }

    /**
     * Sets the date that the transaction occurred. Some gateways don’t send this value.
     */
    global void setGatewayDate(Datetime gatewayDate) { }

    /**
     * Sets error messages that the gateway returned for the payment request. Maximum length of 255 characters.
     */
    global void setGatewayMessage(String gatewayMessage) { }

    /**
     * Sets additional data that you can use for subsequent transactions. You can use any data that isn’t normalized in financial entities. This field has a maximum length of 1000 characters and can store data as JSON or XML.
     */
    global void setGatewayReferenceDetails(String gatewayReferenceDetails) { }

    /**
     * Sets the unique gateway reference number for the transaction that the gateway returned. Maximum length of 255 characters.
     */
    global override void setGatewayReferenceNumber(String gatewayReferenceNumber) { }

    /**
     * Sets a gateway-specific result code. The code can be mapped to a Salesforce-specific result code. Maximum length of 64 characters.
     */
    global void setGatewayResultCode(String gatewayResultCode) { }

    /**
     * Sets a description of the gateway-specific result code that a gateway returned. Maximum length of 1000 characters.
     */
    global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) { }

    /**
     * Sets the ID of a notification sent by the payment gateway.
     */
    global void setId(String id) { }

    global void setRetryCategory(commercepayments.RetryCategory retryCategory) { }

    global void setRetryDecision(commercepayments.RetryDecision retryDecision) { }

    /**
     * Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
     */
    global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) { }

    /**
     * Sets the notification status to the same value that was sent by the gateway.
     */
    global void setStatus(commercepayments.NotificationStatus status) { }

    global override virtual String toString() { return null; }
}