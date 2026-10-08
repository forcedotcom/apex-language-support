global with sharing class UnreferencedRefundNotification extends commercepayments.BaseNotification {
    global UnreferencedRefundNotification() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override void setAmount(Double amount) { }

    global void setGatewayAvsCode(String gatewayAvsCode) { }

    global void setGatewayDate(Datetime gatewayDate) { }

    global void setGatewayMessage(String gatewayMessage) { }

    global void setGatewayReferenceDetails(String gatewayReferenceDetails) { }

    global override void setGatewayReferenceNumber(String gatewayReferenceNumber) { }

    global void setGatewayResultCode(String gatewayResultCode) { }

    global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) { }

    global void setId(String id) { }

    global void setRetryCategory(commercepayments.RetryCategory retryCategory) { }

    global void setRetryDecision(commercepayments.RetryDecision retryDecision) { }

    global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) { }

    global void setStatus(commercepayments.NotificationStatus status) { }

    global override virtual String toString() { return null; }
}