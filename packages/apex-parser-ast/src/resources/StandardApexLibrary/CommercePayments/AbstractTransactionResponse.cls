/**
 * Abstract class for storing normalized information sent from payment gateways about a payment transaction. Holds the common response fields sent from payment gateways for authorization, sale, capture, and refund transactions.
 * <p>Usage
 * Specify the CommercePayments namespace when creating an instance of this class. The constructor of this class takes no arguments. For example:
 * CommercePayments.AbstractTransactionResponse atr = new CommercePayments.AbstractTransactionResponse();
 */
global abstract with sharing class AbstractTransactionResponse extends commercepayments.AbstractResponse {
    global AbstractTransactionResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the transaction amount. Must be a non-negative value.
     */
    global virtual void setAmount(Double amount) { }

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
    global virtual void setGatewayReferenceNumber(String gatewayReferenceNumber) { }

    /**
     * Sets a gateway-specific result code. You can map the result code to a Salesforce-specific result code. Maximum length of 64 characters.
     */
    global void setGatewayResultCode(String gatewayResultCode) { }

    /**
     * Sets a description of the gateway-specific result code that a payment gateway returned. Maximum length of 1000 characters.
     */
    global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) { }

    global void setRetryCategory(commercepayments.RetryCategory retryCategory) { }

    global void setRetryDecision(commercepayments.RetryDecision retryDecision) { }

    /**
     * Sets the Salesforce-specific result code information.
     */
    global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) { }

    global override virtual String toString() { return null; }
}