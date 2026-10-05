global with sharing class UnreferencedRefundResponse extends commercepayments.AbstractTransactionResponse {
    global UnreferencedRefundResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global virtual void setAmount(Double amount) { }

    global void setAsync(Boolean async) { }

    global void setGatewayAvsCode(String gatewayAvsCode) { }

    global void setGatewayDate(Datetime gatewayDate) { }

    global void setGatewayMessage(String gatewayMessage) { }

    global void setGatewayReferenceDetails(String gatewayReferenceDetails) { }

    global virtual void setGatewayReferenceNumber(String gatewayReferenceNumber) { }

    global void setGatewayResultCode(String gatewayResultCode) { }

    global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) { }

    global void setRetryCategory(commercepayments.RetryCategory retryCategory) { }

    global void setRetryDecision(commercepayments.RetryDecision retryDecision) { }

    global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) { }

    global override virtual String toString() { return null; }
}