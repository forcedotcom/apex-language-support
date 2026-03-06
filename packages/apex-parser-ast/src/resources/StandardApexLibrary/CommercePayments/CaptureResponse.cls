/**
 * The payment gateway adapter sends this response for the capture request type. This class extends AbstractResponse and inherits its methods.
 */
global class CaptureResponse {

  /**
   * Sets the transaction amount.
   * @param amount The amount to be debited or captured.
   */
  global void setAmount(Double amount) {}

  /**
   * Indicates whether the payment gateway adapter used in the payment capture was asynchronous ( True ) or synchronous ( False ) .
   * @param async 
   */
  global void setAsync(Boolean async) {}

  /**
   * Sets the payment gateway’s AVS (address verification system) code.
   * @param gatewayAvsCode Payment gateways that use an AVS system return this code.
   */
  global void setGatewayAvsCode(String gatewayAvsCode) {}

  /**
   * Sets the payment gateway’s date.
   * @param gatewayDate The date that communication happened with the gateway.
   */
  global void setGatewayDate(Datetime gatewayDate) {}

  /**
   * Sets information or messages that the gateway returned.
   * @param gatewayMessage Information or error messages returned by the gateway.
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
   * Sets the payment gateway’s result code.
   * @param gatewayResultCode The gateway result code. You must map this to a Salesforce result code.
   */
  global void setGatewayResultCode(String gatewayResultCode) {}

  /**
   * Sets the payment gateway’s result code description.
   * @param gatewayResultCodeDescription Description of the GatewayResultCode. Provides additional context about the result code that the gateway returned.
   */
  global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  /**
   * Sets Salesforce result code information.
   * @param salesforceResultCodeInfo 
   */
  global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

}