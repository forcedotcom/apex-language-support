/**
 * When a payment gateway sends a notification for a sale payment, the payment gateway adapter creates the SaleNotification object to store information about notification.
 */
global class SaleNotification {

  public void setAmount(Double amount) {}

  public void setGatewayAvsCode(String gatewayAvsCode) {}

  public void setGatewayDate(Datetime gatewayDate) {}

  public void setGatewayMessage(String gatewayMessage) {}

  public void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  public void setGatewayReferenceNumber(String gatewayReferenceNumber) {}

  public void setGatewayResultCode(String gatewayResultCode) {}

  public void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  public void setId(String id) {}

  public void setRetryCategory(commercepayments.RetryCategory retryCategory) {}

  public void setRetryDecision(commercepayments.RetryDecision retryDecision) {}

  public void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

  public void setStatus(commercepayments.NotificationStatus status) {}

}