/**
 * Response sent by payment gateway adapters for a sales service.
 */
public class SaleResponse {

  /**
   * Sets the transaction amount. Must be a non-negative value.
   * @param amount The amount of the transaction.
   */
  public void setAmount(Double amount) {}

  /**
   * Sets the AVS (address verification system) result code information that the gateway returned. Maximum length of 64 characters.
   * @param gatewayAvsCode Used to verify the address mapped to a payment method when the payments platform requests tokenization from the payment gateway.
   */
  public void setGatewayAvsCode(String gatewayAvsCode) {}

  /**
   * Sets the date that the sale occurred. Some gateways don’t send this value.
   * @param gatewayDate 
   */
  public void setGatewayDate(Datetime gatewayDate) {}

  /**
   * Sets error messages that the gateway returned for the sale request. Maximum length of 255 characters.
   * @param gatewayMessage 
   */
  public void setGatewayMessage(String gatewayMessage) {}

  /**
   * Sets additional data that you can use for subsequent sales. You can use any data that isn’t normalized in financial entities. This field has a maximum length of 1000 characters and can store data as JSON or XML.
   * @param gatewayReferenceDetails 
   */
  public void setGatewayReferenceDetails(String gatewayReferenceDetails) {}

  /**
   * Sets the unique gateway reference number for the transaction that the gateway returned. Maximum length of 255 characters.
   * @param gatewayReferenceNumber Unique authorization ID created by the payment gateway.
   */
  public void setGatewayReferenceNumber(String gatewayReferenceNumber) {}

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
   * Sets information from the gateway about the tokenized payment method.
   * @param paymentMethodTokenizationResponse Gateway response sent by payment gateway adapters for the payment method tokenization request. The response includes the payment method’s token ID value.
   */
  public void setPaymentMethodTokenizationResponse(commercepayments.PaymentMethodTokenizationResponse paymentMethodTokenizationResponse) {}

  /**
   * Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
   * @param salesforceResultCodeInfo Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
   */
  public void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) {}

}