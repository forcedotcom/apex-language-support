/**
 * When a payment gateway sends a notification for a sale payment, the payment gateway adapter creates the SaleNotification object to store information about notification.
 */
global class SaleNotification {

  global SaleNotification() {}

  global void setAmount(Double amount) {}

  global void setGatewayAvsCode(String gatewayAvsCode) {}

  global void setGatewayDate(Datetime gatewayDate) {}

  global void setGatewayMessage(String gatewayMessage) {}

  global void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  global void setGatewayReferenceNumber(String gatewayReferenceNumber) {}

  global void setGatewayResultCode(String gatewayResultCode) {}

  global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  global void setId(String id) {}

  global void setRetryCategory(commercepayments.RetryCategory retryCategory) {}

  global void setRetryDecision(commercepayments.RetryDecision retryDecision) {}

  global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

  global void setStatus(commercepayments.NotificationStatus status) {}

  global Object clone() {}

}