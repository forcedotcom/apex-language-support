/**
 * When a payment gateway sends a notification for a capture transaction, the payment gateway adapter creates the CaptureNotification object to store information about the notification.
 */
global class CaptureNotification {

  /**
   * Sets the transaction amount. Must be a non-negative value.
   * @param amount The amount to be debited or captured.
   */
  global void setAmount(Double amount) {}

  public void setGatewayAvsCode(String gatewayAvsCode) {}

  /**
   * Sets the date that the transaction occurred. Some gateways don’t send this value.
   * @param gatewayDate Date and time of the gateway communication.
   */
  global void setGatewayDate(Datetime gatewayDate) {}

  /**
   * Sets error messages that the gateway returned for the payment request. Maximum length of 255 characters.
   * @param gatewayMessage Information on error messages sent from the gateway.
   */
  global void setGatewayMessage(String gatewayMessage) {}

  /**
   * Sets additional data that you can use for subsequent transactions. You can use any data that isn’t normalized in financial entities. This field has a maximum length of 1000 characters and can store data as JSON or XML.
   * @param gatewayReferenceDetails 
   */
  global void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  /**
   * Sets the unique gateway reference number for the transaction that the gateway returned. Maximum length of 255 characters.
   * @param gatewayReferenceNumber Unique transaction ID created by the payment gateway.
   */
  global void setGatewayReferenceNumber(String gatewayReferenceNumber) {}

  /**
   * Sets a gateway-specific result code. The code can be mapped to a Salesforce-specific result code. Maximum length of 64 characters.
   * @param gatewayResultCode Gateway-specific result code. Map this value to a Salesforce-specific result code.
   */
  global void setGatewayResultCode(String gatewayResultCode) {}

  /**
   * Sets a description of the gateway-specific result code that a gateway returned. Maximum length of 1000 characters.
   * @param gatewayResultCodeDescription Description of the gateway’s result code. Use this field to learn more about why the gateway returned a certain result code.
   */
  global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  /**
   * Sets the ID of a notification sent by the payment gateway.
   * @param id 
   */
  global void setId(String id) {}

  /**
   * Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
   * @param salesforceResultCodeInfo Description of the Salesforce result code value.
   */
  global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

  /**
   * Sets the notification status to the same value that was sent by the gateway.
   * @param status Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
   */
  global void setStatus(commercepayments.NotificationStatus status) {}

}