/**
 * The payment gateway adapter sends this response for the capture request type. This class extends AbstractResponse and inherits its methods.
 * <p>Usage
 * You must specify the CommercePayments namespace when creating an instance of this class. The constructor of this class takes no arguments. For example:
 * CommercePayments.Capture Response ctr = new CommercePayments.CaptureResponse();
 */
global with sharing class CaptureResponse extends commercepayments.AbstractTransactionResponse {
    global CaptureResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the transaction amount.
     */
    global virtual void setAmount(Double amount) { }

    /**
     * Indicates whether the payment gateway adapter used in the payment capture was asynchronous (True) or synchronous (False).
     */
    global void setAsync(Boolean async) { }

    /**
     * Sets the payment gateway’s AVS (address verification system) code.
     */
    global void setGatewayAvsCode(String gatewayAvsCode) { }

    /**
     * Sets the payment gateway’s date.
     */
    global void setGatewayDate(Datetime gatewayDate) { }

    /**
     * Sets information or messages that the gateway returned.
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
     * Sets the payment gateway’s result code.
     */
    global void setGatewayResultCode(String gatewayResultCode) { }

    /**
     * Sets the payment gateway’s result code description.
     */
    global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) { }

    global void setRetryCategory(commercepayments.RetryCategory retryCategory) { }

    global void setRetryDecision(commercepayments.RetryDecision retryDecision) { }

    /**
     * Sets Salesforce result code information.
     */
    global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) { }

    global override virtual String toString() { return null; }
}