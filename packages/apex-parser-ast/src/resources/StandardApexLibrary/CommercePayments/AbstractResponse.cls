/**
 * Contains the normalized response fields from payment gateways that are common to all the other gateway responses.
 */
public class AbstractResponse {

  /**
   * Sets the AVS (address verification system) result code information that the gateway returned. Maximum length of 64 characters.
   * @param gatewayAvsCode Code sent by gateways that use an address verification system.
   */
  public void setGatewayAvsCode(String gatewayAvsCode) {}

  /**
   * Sets the date that the transaction occurred. Some gateways don’t send this value.
   * @param gatewayDate Date and time of the gateway communication.
   */
  public void setGatewayDate(Datetime gatewayDate) {}

  /**
   * Sets error messages that the gateway returned for the payment request. Maximum length of 255 characters.
   * @param gatewayMessage Information on error messages sent from the gateway.
   */
  public void setGatewayMessage(String gatewayMessage) {}

  /**
   * Sets a gateway-specific result code. The code may be mapped to a Salesforce-specific result code. Maximum length of 64 characters.
   * @param gatewayResultCode Gateway-specific result code. Must be used to map a Salesforce-specific result code.
   */
  public void setGatewayResultCode(String gatewayResultCode) {}

  /**
   * Sets a description of the gateway-specific result code that a payment gateway returned. Maximum length of 1000 characters.
   * @param gatewayResultCodeDescription Description of the gateway’s result code. Use this field to learn more about why the gateway returned a certain result code.
   */
  public void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  /**
   * Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
   * @param salesforceResultCodeInfo Description of the Salesforce result code value.
   */
  public void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

}