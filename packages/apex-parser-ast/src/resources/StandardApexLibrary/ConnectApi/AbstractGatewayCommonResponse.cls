/**
 * Payment gateway response fields commonly used in payment services.
 */
global class AbstractGatewayCommonResponse {

  /**
   * Used to verify the address mapped to a payment method when the payments platform requests tokenization from the payment gateway.
   */
  global String gatewayAvsCode;

  /**
   * Date when the notification occurred. Some gateways don’t send this value.
   */
  global Datetime gatewayDate;

  /**
   * Error messages that the gateway returned for the notification request. Maximum length of 255 characters.
   */
  global String gatewayMessage;

  /**
   * Gateway-specific result code. You can map the result code to a Salesforce-specific result code. Maximum length of 64 characters.
   */
  global String gatewayResultCode;

  /**
   * A description of the gateway-specific result code that a payment gateway returned. Maximum length of 1,000 characters.
   */
  global String gatewayResultCodeDescription;

  /**
   * The Salesforce result code for the gateway result code.
   */
  global String salesforceResultCode;

}