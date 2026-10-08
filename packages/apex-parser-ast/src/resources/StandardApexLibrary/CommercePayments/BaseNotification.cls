/**
 * Abstract class for storing notification information sent from payment gateways.
 * Usage
 * An abstract class that contains the common fields from payment gateways. BaseNotification can’t be instantiated on its own.
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.BaseNotification bnt = new CommercePayments.BaseNotification();
 * Example
 * commercepayments.BaseNotification notification = null;
 *         if ('CAPTURE'.equals(eventCode)) {
 *             notification = new commercepayments.CaptureNotification();
 *         } else if ('REFUND'.equals(eventCode)) {
 *             notification = new commercepayments.ReferencedRefundNotification();
 *         }
 */
global abstract with sharing class BaseNotification extends commercepayments.AbstractTransactionResponse {
    global BaseNotification() { }

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
     * Sets the date that the notification occurred. Some gateways don’t send this value.
     */
    global void setGatewayDate(Datetime gatewayDate) { }

    /**
     * Sets error messages that the gateway returned for the notification request. Maximum length of 255 characters.
     */
    global void setGatewayMessage(String gatewayMessage) { }

    /**
     * Sets the payment gateway’s reference details.
     */
    global void setGatewayReferenceDetails(String gatewayReferenceDetails) { }

    /**
     * Sets the payment gateway’s reference number.
     */
    global override void setGatewayReferenceNumber(String gatewayReferenceNumber) { }

    /**
     * Sets a gateway-specific result code. The code can be mapped to a Salesforce-specific result code. Maximum length of 64 characters.
     */
    global void setGatewayResultCode(String gatewayResultCode) { }

    /**
     * Sets a description of the gateway-specific result code that a payment gateway returned. Maximum length of 1000 characters.
     */
    global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) { }

    /**
     * Sets the ID of the notification sent by the gateway.
     */
    global void setId(String id) { }

    global void setRetryCategory(commercepayments.RetryCategory retryCategory) { }

    global void setRetryDecision(commercepayments.RetryDecision retryDecision) { }

    /**
     * Sets the information about the Salesforce-specific result code used to match a result code from a payment gateway.
     */
    global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) { }

    /**
     * Sets the status of the notification sent by the gateway.
     */
    global void setStatus(commercepayments.NotificationStatus status) { }

    global override virtual String toString() { return null; }
}