/**
 * Abstract class for storing normalized information sent from payment gateways about a payment transaction. Holds the common response fields sent from payment gateways for authorization, sale, capture, and refund transactions.
 */
global class AbstractTransactionResponse {

  /**
   * Sets the transaction amount. Must be a non-negative value.
   * @param amount The amount of the transaction.
   */
  global void setAmount(Double amount) {}

  /**
   * Sets the AVS (address verification system) result code that the gateway returned. Maximum length of 64 characters.
   * @param gatewayAvsCode Used to verify the address mapped to a payment method when the payments platform requests tokenization from the payment gateway.
   */
  global void setGatewayAvsCode(String gatewayAvsCode) {}

  /**
   * Sets the date that the notification occurred. Some gateways don’t send this value.
   * @param gatewayDate The date that the transaction occurred.
   */
  global void setGatewayDate(Datetime gatewayDate) {}

  /**
   * Sets error messages that the gateway returned for the notification request. Maximum length of 255 characters.
   * @param gatewayMessage The message that the gateway returned with the transaction request. Contains additional information about the transaction.
   */
  global void setGatewayMessage(String gatewayMessage) {}

  /**
   * Sets the payment gateway’s reference details.
   * @param gatewayReferenceDetails Provides information about the gateway communication.
   */
  global void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  /**
   * Sets the payment gateway’s reference number.
   * @param gatewayReferenceNumber Unique transaction ID created by the payment gateway.
   */
  global void setGatewayReferenceNumber(String gatewayReferenceNumber) {}

  /**
   * Sets a gateway-specific result code. You can map the result code to a Salesforce-specific result code. Maximum length of 64 characters.
   * @param gatewayResultCode Gateway-specific result code. Must be mapped to a Salesforce-specific result code.
   */
  global void setGatewayResultCode(String gatewayResultCode) {}

  /**
   * Sets a description of the gateway-specific result code that a payment gateway returned. Maximum length of 1000 characters.
   * @param gatewayResultCodeDescription Provides additional information about the result code and why the gateway returned the specific code. Descriptions vary between different gateways.
   */
  global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  /**
   * Sets the Salesforce-specific result code information.
   * @param salesforceResultCodeInfo Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
   */
  global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

}