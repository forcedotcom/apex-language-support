/**
 * Response sent by the payment gateway adapter for a postauthorization service.
 */
global class PostAuthorizationResponse extends AbstractTransactionResponse {

  global void setAlternativePaymentMethodResponse(commercepayments.AlternativePaymentMethodResponse paymentMethodResponse) {}

  public void setAmount(Double amount) {}

  global void setAsync(Boolean async) {}

  global void setAuthorizationExpirationDate(Datetime authExpDate) {}

  global void setGatewayAuthCode(String gatewayAuthCode) {}

  public void setGatewayAvsCode(String gatewayAvsCode) {}

  public void setGatewayDate(Datetime gatewayDate) {}

  public void setGatewayMessage(String gatewayMessage) {}

  public void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  public void setGatewayReferenceNumber(String gatewayReferenceNumber) {}

  public void setGatewayResultCode(String gatewayResultCode) {}

  public void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  public void setPaymentMethodDetails(commercepayments.PaymentMethodDetailsResponse paymentMethodDetails) {}

  global void setPaymentMethodTokenizationResponse(commercepayments.PaymentMethodTokenizationResponse paymentMethodTokenizationResponse) {}

  public void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

}