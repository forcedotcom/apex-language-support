/**
 * Response sent by the payment gateway adapter for a postauthorization service.
 */
global class PostAuthorizationResponse extends AbstractTransactionResponse {

  global PostAuthorizationResponse() {}

  global void setAlternativePaymentMethodResponse(commercepayments.AlternativePaymentMethodResponse paymentMethodResponse) {}

  global void setAmount(Double amount) {}

  global void setAsync(Boolean async) {}

  global void setAuthorizationExpirationDate(Datetime authExpDate) {}

  global void setGatewayAuthCode(String gatewayAuthCode) {}

  global void setGatewayAvsCode(String gatewayAvsCode) {}

  global void setGatewayDate(Datetime gatewayDate) {}

  global void setGatewayMessage(String gatewayMessage) {}

  global void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  global void setGatewayReferenceNumber(String gatewayReferenceNumber) {}

  global void setGatewayResultCode(String gatewayResultCode) {}

  global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  global void setPaymentMethodDetails(commercepayments.PaymentMethodDetailsResponse paymentMethodDetails) {}

  global void setPaymentMethodTokenizationResponse(commercepayments.PaymentMethodTokenizationResponse paymentMethodTokenizationResponse) {}

  global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

  global Object clone() {}

  global void setRetryCategory(commercepayments.RetryCategory retryCategory) {}

  global void setRetryDecision(commercepayments.RetryDecision retryDecision) {}

}