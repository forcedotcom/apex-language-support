/**
 * The payment gateway adapter sends this response for the ReferencedRefund request type.
 */
public class ReferencedRefundResponse {

  /**
   * Sets the transaction amount. The value must be a postive number.
   * @param amount The amount to be debited or captured.
   */
  public void setAmount(Double amount) {}

  /**
   * Sets the payment gateway’s address verification system (AVS) code.
   * @param gatewayAvsCode Code sent by gateways that use an address verification system.
   */
  public void setGatewayAvsCode(String gatewayAvsCode) {}

  /**
   * Sets the payment gateway’s date.
   * @param gatewayDate Date and time of the gateway communication.
   */
  public void setGatewayDate(Datetime gatewayDate) {}

  /**
   * Sets information or messages that the gateway returned.
   * @param gatewayMessage Information or error messages returned by the gateway.
   */
  public void setGatewayMessage(String gatewayMessage) {}

  /**
   * Sets the payment gateway’s reference details.
   * @param gatewayReferenceDetails Information about the gateway communication.
   */
  public void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  /**
   * Sets the payment gateway’s reference number.
   * @param gatewayReferenceNumber Unique transaction ID created by the payment gateway.
   */
  public void setGatewayReferenceNumber(String gatewayReferenceNumber) {}

  /**
   * Sets the payment gateway’s result code.
   * @param gatewayResultCode The gateway result code. Must be mapped to a Salesforce result code.
   */
  public void setGatewayResultCode(String gatewayResultCode) {}

  /**
   * Sets the payment gateway’s result code description.
   * @param gatewayResultCodeDescription Description of the GatewayResultCode . Provides more information about the result code returned by the gateway.
   */
  public void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  /**
   * Set the Salesforce result code info.
   * @param salesforceResultCodeInfo Describes the Salesforce result code value.
   */
  public void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

}