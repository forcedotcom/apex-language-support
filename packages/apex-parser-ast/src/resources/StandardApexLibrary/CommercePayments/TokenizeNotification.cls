/**
 * When a payment gateway sends a notification for a payment method tokenization, the payment gateway adapter creates the TokenizeNotification object to store information about notification.
 */
global class TokenizeNotification {

  public void setAmount(Double amount) {}

  public void setGatewayAvsCode(String gatewayAvsCode) {}

  public void setGatewayDate(Datetime gatewayDate) {}

  public void setGatewayMessage(String gatewayMessage) {}

  public void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  public void setGatewayReferenceNumber(String gatewayReferenceNumber) {}

  public void setGatewayResultCode(String gatewayResultCode) {}

  public void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  public void setGatewayToken(String gatewayToken) {}

  public void setGatewayTokenEncrypted(String gatewayTokenEncrypted) {}

  public void setId(String id) {}

  public void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

  public void setStatus(commercepayments.NotificationStatus status) {}

}