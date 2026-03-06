/**
 * Response sent by the payment gateway adapter for an authorization service.
 */
global class AuthorizationResponse {

  /**
   * Sets the amount of the authorization. Must be a non-zero value.
   * @param amount 
   */
  global void setAmount(Double amount) {}

  public void setAsync(Boolean async) {}

  /**
   * Sets the expiration date of the authorization request.
   * @param authExpDate 
   */
  global void setAuthorizationExpirationDate(Datetime authExpDate) {}

  /**
   * Sets the authorization code that the gateway returned. Maximum length of 64 characters.
   * @param gatewayAuthCode The authorization code returned by the gateway.
   */
  global void setGatewayAuthCode(String gatewayAuthCode) {}

  /**
   * Sets the AVS (address verification system) result code information that the gateway returned. Maximum length of 64 characters.
   * @param gatewayAvsCode Used to verify the address mapped to a payment method when the payments platform requests tokenization from the payment gateway.
   */
  global void setGatewayAvsCode(String gatewayAvsCode) {}

  /**
   * Sets the date that the authorization occurred. Some gateways don’t send this value.
   * @param gatewayDate 
   */
  global void setGatewayDate(Datetime gatewayDate) {}

  /**
   * Sets error messages that the gateway returned for the authorization request. Maximum length of 255 characters.
   * @param gatewayMessage 
   */
  global void setGatewayMessage(String gatewayMessage) {}

  /**
   * Stores data that you can use for subsequent authorizations. You can use any data that isn’t normalized in financial entities. This field has a maximum length of 1000 characters and can store data as JSON or XML.
   * @param gatewayReferenceDetails 
   */
  global void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  /**
   * Sets the unique gateway reference number for the transaction that the gateway returned. Maximum length of 255 characters.
   * @param gatewayReferenceNumber Unique authorization ID created by the payment gateway.
   */
  global void setGatewayReferenceNumber(String gatewayReferenceNumber) {}

  /**
   * Sets a gateway-specific result code. The code can be mapped to a Salesforce-specific result code. Maximum length of 64 characters.
   * @param gatewayResultCode Gateway-specific result code. Must be used to map a Salesforce-specific result code.
   */
  global void setGatewayResultCode(String gatewayResultCode) {}

  /**
   * Sets a description of the gateway-specific result code that a payment gateway returned. Maximum length of 1000 characters.
   * @param gatewayResultCodeDescription Description of the gateway’s result code. Use this field to learn more about why the gateway returned a certain result code.
   */
  global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  /**
   * Sets information from the gateway about the tokenized payment method.
   * @param paymentMethodTokenizationResponse 
   */
  global void setPaymentMethodTokenizationResponse(commercepayments.PaymentMethodTokenizationResponse paymentMethodTokenizationResponse) {}

  /**
   * Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
   * @param salesforceResultCodeInfo Description of the Salesforce result code value.
   */
  global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

}