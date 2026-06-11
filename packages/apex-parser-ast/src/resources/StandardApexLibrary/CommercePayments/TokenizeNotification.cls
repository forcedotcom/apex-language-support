/**
 * When a payment gateway sends a notification for a payment method tokenization, the payment gateway adapter creates the TokenizeNotification object to store information about notification.
 */
global class TokenizeNotification {

  global TokenizeNotification() {}

  global void setAmount(Double amount) {}

  global void setGatewayAvsCode(String gatewayAvsCode) {}

  global void setGatewayDate(Datetime gatewayDate) {}

  global void setGatewayMessage(String gatewayMessage) {}

  global void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  global void setGatewayReferenceNumber(String gatewayReferenceNumber) {}

  global void setGatewayResultCode(String gatewayResultCode) {}

  global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  global void setGatewayToken(String gatewayToken) {}

  global void setGatewayTokenEncrypted(String gatewayTokenEncrypted) {}

  global void setId(String id) {}

  global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

  global void setStatus(commercepayments.NotificationStatus status) {}

  global Object clone() {}

  global void setRetryCategory(commercepayments.RetryCategory retryCategory) {}

  global void setRetryDecision(commercepayments.RetryDecision retryDecision) {}

}