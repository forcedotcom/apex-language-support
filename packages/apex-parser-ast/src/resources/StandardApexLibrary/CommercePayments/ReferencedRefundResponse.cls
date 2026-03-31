/**
 * The payment gateway adapter sends this response for the ReferencedRefund request type.
 */
global class ReferencedRefundResponse {

  /**
   * Sets the transaction amount. The value must be a postive number.
   * @param amount The amount to be debited or captured.
   */
  global void setAmount(Double amount) {}

  public void setAsync(Boolean async) {}

  /**
   * Sets the payment gateway’s address verification system (AVS) code.
   * @param gatewayAvsCode Code sent by gateways that use an address verification system.
   */
  global void setGatewayAvsCode(String gatewayAvsCode) {}

  /**
   * Sets the payment gateway’s date.
   * @param gatewayDate Date and time of the gateway communication.
   */
  global void setGatewayDate(Datetime gatewayDate) {}

  /**
   * Sets information or messages that the gateway returned.
   * @param gatewayMessage Information or error messages returned by the gateway.
   */
  global void setGatewayMessage(String gatewayMessage) {}

  /**
   * Sets the payment gateway’s reference details.
   * @param gatewayReferenceDetails Information about the gateway communication.
   */
  global void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  /**
   * Sets the payment gateway’s reference number.
   * @param gatewayReferenceNumber Unique transaction ID created by the payment gateway.
   */
  global void setGatewayReferenceNumber(String gatewayReferenceNumber) {}

  /**
   * Sets the payment gateway’s result code.
   * @param gatewayResultCode The gateway result code. Must be mapped to a Salesforce result code.
   */
  global void setGatewayResultCode(String gatewayResultCode) {}

  /**
   * Sets the payment gateway’s result code description.
   * @param gatewayResultCodeDescription Description of the GatewayResultCode . Provides more information about the result code returned by the gateway.
   */
  global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  /**
   * Set the Salesforce result code info.
   * @param salesforceResultCodeInfo Describes the Salesforce result code value.
   */
  global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

}