/**
 * Gateway response sent by payment gateway adapters for the payment method tokenization request. The response includes the payment method’s token ID value.
 */
public class PaymentMethodTokenizationResponse {

  /**
   * Sets the AVS (address verification system) result code information that the gateway returned. Maximum length of 64 characters.
   * @param gatewayAvsCode Used to verify the address mapped to a payment method when the payments platform requests tokenization from the payment gateway.
   */
  public void setGatewayAvsCode(String gatewayAvsCode) {}

  /**
   * Sets the date that the tokenization occurred. Some gateways don’t send this value.
   * @param gatewayDate 
   */
  public void setGatewayDate(Datetime gatewayDate) {}

  /**
   * Sets error messages that the gateway returned for the tokenization request. Maximum length of 255 characters.
   * @param gatewayMessage 
   */
  public void setGatewayMessage(String gatewayMessage) {}

  /**
   * Sets a gateway-specific result code. The code may be mapped to a Salesforce-specific result code. Maximum length of 64 characters.
   * @param gatewayResultCode Gateway-specific result code. Must be used to map a Salesforce-specific result code.
   */
  public void setGatewayResultCode(String gatewayResultCode) {}

  /**
   * Sets a description of the gateway-specific result code that a payment gateway returned. Maximum length of 1000 characters.
   * @param gatewayResultCodeDescription Provides additional information about the result code and why the gateway returned the specific code. Descriptions will vary between different gateways.
   */
  public void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  /**
   * Sets the gateway token value that the gateway returned.
   * @param gatewayToken The gateway token that the payment gateway sends following a tokenization request.
   */
  public void setGatewayToken(String gatewayToken) {}

  /**
   * Sets any additional information that the gateway returned about the payment token.
   * @param gatewayTokenDetails 
   */
  public void setGatewayTokenDetails(String gatewayTokenDetails) {}

  public void setGatewayTokenEncrypted(String gatewayTokenEncrypted) {}

  /**
   * Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
   * @param salesforceResultCodeInfo Description of the Salesforce result code value.
   */
  public void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

}