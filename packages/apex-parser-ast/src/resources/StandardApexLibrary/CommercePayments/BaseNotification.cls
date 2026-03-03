/**
 * Abstract class for storing notification information sent from payment gateways.
 */
global class BaseNotification {

  /**
   * Sets the transaction amount. Must be a non-negative value.
   * @param amount The amount of the transaction.
   */
  global void setAmount(Double amount) {}

  public void setGatewayAvsCode(String gatewayAvsCode) {}

  /**
   * Sets the date that the notification occurred. Some gateways don’t send this value.
   * @param gatewayDate The date that the notification occurred.
   */
  global void setGatewayDate(Datetime gatewayDate) {}

  /**
   * Sets error messages that the gateway returned for the notification request. Maximum length of 255 characters.
   * @param gatewayMessage The message that the gateway returned with the notification request. Contains additional information about the notification.
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
   * Sets a gateway-specific result code. The code can be mapped to a Salesforce-specific result code. Maximum length of 64 characters.
   * @param gatewayResultCode Gateway-specific result code. Must be used to map a Salesforce-specific result code.
   */
  global void setGatewayResultCode(String gatewayResultCode) {}

  /**
   * Sets a description of the gateway-specific result code that a payment gateway returned. Maximum length of 1000 characters.
   * @param gatewayResultCodeDescription Provides additional information about the result code and why the gateway returned the code. Descriptions vary between different gateways.
   */
  global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  /**
   * Sets the ID of the notification sent by the gateway.
   * @param id 
   */
  global void setId(String id) {}

  /**
   * Sets the information about the Salesforce-specific result code used to match a result code from a payment gateway.
   * @param salesforceResultCodeInfo Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
   */
  global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

  /**
   * Sets the status of the notification sent by the gateway.
   * @param status Shows whether the payments platform successfully received the notification from the gateway.
   */
  global void setStatus(commercepayments.NotificationStatus status) {}

}