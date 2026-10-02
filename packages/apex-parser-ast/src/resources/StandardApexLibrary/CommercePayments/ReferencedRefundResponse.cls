/**
 * The payment gateway adapter sends this response for the ReferencedRefund request type.
 * <p>Usage
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.ReferencedRefundResponse refr = new CommercePayments.ReferencedRefundResponse();
 */
global with sharing class ReferencedRefundResponse extends commercepayments.AbstractTransactionResponse {
    global Object ReferencedRefundResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the transaction amount. The value must be a postive number.
     */
    global virtual void setAmount(Double amount) { }

    /**
     * Sets whether the payment capture or authorization is asynchronous (True) or synchronous (False). If True, then the payment refund record created has a status of Pending.
     */
    global void setAsync(Boolean async) { }

    /**
     * Sets the payment gateway’s address verification system (AVS) code.
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
     * Set the Salesforce result code info.
     */
    global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) { }

    global override virtual String toString() { return null; }
}