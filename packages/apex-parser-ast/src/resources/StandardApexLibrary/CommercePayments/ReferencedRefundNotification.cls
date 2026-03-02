/**
 * When a payment gateway sends a notification for a refund transaction, the payment gateway adapter creates the ReferencedRefundNotification object to store information about notification.
 */
public class ReferencedRefundNotification {

  /**
   * Sets the transaction amount. Can be positive, negative, or zero.
   * @param amount The amount to be debited or captured.
   */
  public void setAmount(Double amount) {}

  /**
   * Sets the date that communication for the refund notification occurred with the payment gateway.
   * @param gatewayDate The date that communication happened with the gateway.
   */
  public void setGatewayDate(Datetime gatewayDate) {}

  /**
   * Sets information or messages that the gateway returned.
   * @param gatewayMessage 
   */
  public void setGatewayMessage(String gatewayMessage) {}

  /**
   * Sets the payment gateway’s reference details.
   * @param gatewayReferenceDetails Provides information about the gateway communication.
   */
  public void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  /**
   * Sets the payment gateway’s reference number.
   * @param gatewayReferenceNumber Unique transaction ID created by the payment gateway.
   */
  public void setGatewayReferenceNumber(String gatewayReferenceNumber) {}

  /**
   * Sets the payment gateway’s result code.
   * @param gatewayResultCode The gateway result code. You must map this to a Salesforce-specific result code.
   */
  public void setGatewayResultCode(String gatewayResultCode) {}

  /**
   * Sets the payment gateway’s result code description.
   * @param gatewayResultCodeDescription Description of the gateway result code. Provides additional context about the result code .
   */
  public void setGatewayResultCodeDescription(String gatewayResultCodeDescription) {}

  /**
   * Sets the ID of a notification sent by the payment gateway.
   * @param id 
   */
  public void setId(String id) {}

  /**
   * Sets Salesforce result code information.
   * @param salesforceResultCodeInfo Description of the Salesforce result code value.
   */
  public void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

  /**
   * Sets the notification status value on the notification object.
   * @param status Indicates whether the payments platform successfully received the notification from the payment gateway.
   */
  public void setStatus(commercepayments.NotificationStatus status) {}

}