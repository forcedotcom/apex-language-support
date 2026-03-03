/**
 * Response sent by the payment gateway following a payment authorization reversal service.
 */
global class AuthorizationReversalResponse {

  /**
   * Contains the amount of the authorization reversal. Must be a non-zero value.
   * @param amount 
   */
  global void setAmount(Double amount) {}

  /**
   * Sets the AVS (Address Verification System) result code that the gateway returned. Maximum length of 64 characters.
   * @param gatewayAvsCode Used to verify the address mapped to a payment method when the payments platform requests tokenization from the payment gateway.
   */
  global void setGatewayAvsCode(String gatewayAvsCode) {}

  /**
   * Sets the date that the authorization reversal request occurred in the payment gateway. Some gateways don't send this value.
   * @param gatewayDate 
   */
  global void setGatewayDate(Datetime gatewayDate) {}

  /**
   * Sets error messages that the gateway returned for the authorization reversal request. Maximum length of 255 characters.
   * @param gatewayMessage 
   */
  global void setGatewayMessage(String gatewayMessage) {}

  /**
   * Stores data that you can use for subsequent authorizations. You can use any data that isn’t normalized in financial entities. This field has a maximum length of 1000 characters and can store data as JSON or XML.
   * @param gatewayReferenceDetails 
   */
  global void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  /**
   * Sets a unique gateway reference number for the transaction that the gateway returned. Maximum length of 255 characters.
   * @param gatewayReferenceNumber Unique reference ID created by the payment gateway.
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
   * Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
   * @param salesforceResultCodeInfo Description of the Salesforce result code value.
   */
  global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

}