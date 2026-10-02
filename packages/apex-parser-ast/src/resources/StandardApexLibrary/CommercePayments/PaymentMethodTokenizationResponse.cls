/**
 * Gateway response sent by payment gateway adapters for the payment method tokenization request. The response includes the payment method’s token ID value.
 * <p>Usage
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.PaymentMethodTokenizationResponse pmtr = new CommercePayments.PaymentMethodTokenizationResponse();
 * After the payment gateway processes a tokenization request, the fields of PaymentMethodTokenizationResponse receive and store information from the gateway's response. The gateway's response shows whether the tokenization request was successful, the token value, and any additional messages or information about the tokenization process. You can then pass an instance of PaymentMethodTokenizationResponse to an authorization response or a sale response. This class is mapped to a response class in the Java layer.
 * <p>Example
 * This constructor builds a new instance of the PaymentMethodTokenizationResponse class.
 * commercepayments.PaymentMethodTokenizationResponse tokenizeResponse = new commercepayments.PaymentMethodTokenizationResponse();
 * PaymentMethodTokenizationResponse contains only setter methods. Each setter accepts a value from the payment gateway and use it to set an attribute of PaymentMethodTokenizationResponse.
 * The most important method in PaymentMethodTokenizationResponse is setGatewayTokenEncrypted, which uses <a class="xref" href="https://help.salesforce.com/s/articleView?id=platform.fields_about_encrypted_fields.htm&amp;type=5&amp;language=en_US" target="_blank">Salesforce encryption</a> to set an encrypted token value for a payment method. The setGatewayTokenEncrypted method is available in Salesforce API v52.0 and later. We recommend using it to ensure your tokenized payment method values are encrypted and secure. While the setGatewayToken method (available in earlier API versions) also returns a payment method token, the tokenized value isn't encrypted.
 * If the instantiated class already has a gateway token, setGatewayTokenEncrypted throws an error.
 *      /** @description Method to set Gateway token to persist in Encrypted Text * /
 *      global void setGatewayTokenEncrypted(String gatewayTokenEncrypted) {
 *          if (gatewayTokenSet)  {
 *              throwTokenError();
 *          }
 *          this.delegate.setGatewayTokenEncrypted(gatewayTokenEncrypted);
 *          gatewayTokenEncryptedSet = true;
 *      }
 * A typical instantiation of PaymentMethodTokenizationResponse sets the encrypted gateway token alongside the other tokenization response values sent by the gateway.
 *      public commercepayments.GatewayResponse createTokenizeResponse(commercepayments.PaymentMethodTokenizationRequest tokenizeRequest) {
 *          commercepayments.PaymentMethodTokenizationResponse tokenizeResponse = new commercepayments.PaymentMethodTokenizationResponse();
 *          tokenizeResponse.setGatewayTokenEncrypted(gatewayTokenEncrypted);
 *          tokenizeResponse.setGatewayTokenDetails(gatewayTokenDetails);
 *          tokenizeResponse.setGatewayAvsCode(gatewayAvsCode);
 *          tokenizeResponse.setGatewayMessage(gatewayMessage);
 *          tokenizeResponse.setGatewayResultCode(gatewayResultCode);
 *          tokenizeResponse.setGatewayResultCodeDescription(gatewayResultCodeDescription);
 *          tokenizeResponse.setSalesforceResultCodeInfo(SUCCESS_SALESFORCE_RESULT_CODE_INFO);
 *          tokenizeResponse.setGatewayDate(system.now());
 *          return tokenizeResponse;
 *      }
 * After you've built a PaymentMethodTokenizationResponse object and set the encrypted gateway token, pass the object to the setPaymentMethodTokenizationResponse method of an authorization response or a sale response.
 * Authorization Response:
 *      public commercepayments.GatewayResponse createAuthResponse(commercepayments.AuthorizationRequest authRequest) {
 *          commercepayments.AuthorizationResponse authResponse = new commercepayments.AuthorizationResponse();
 *          commercepayments.PaymentMethodTokenizationResponse paymentMethodTokenizationResponse = new commercepayments.PaymentMethodTokenizationResponse();
 *          if(authRequest.amount!=null )
 *          {
 *              authResponse.setAmount(authRequest.amount);
 *          }
 *          else
 *          {
 *              throw new SalesforceValidationException('Required Field Missing : Amount');
 *          }
 *
 *          authResponse.setGatewayResultCode('00');
 *          authResponse.setGatewayResultCodeDescription('Transaction Normal');
 *          authResponse.setGatewayAuthCode('SF'+getRandomNumber(6));
 *          authResponse.setGatewayReferenceNumber(getRandomNumber(10));
 *          authResponse.setSalesforceResultCodeInfo(SUCCESS_SALESFORCE_RESULT_CODE_INFO);
 *          authResponse.setGatewayDate(system.now());
 *          paymentMethodTokenizationResponse.setGatewayTokenEncrypted(gatewayTokenEncrypted);
 *          authResponse.setPaymentMethodTokenizationResponse(paymentMethodTokenizationResponse);
 *          return authResponse;
 *      }
 * Sale Response:
 *      public commercepayments.GatewayResponse createSaleResponse(commercepayments.SaleRequest saleRequest) {
 *          commercepayments.SaleResponse saleResponse = new commercepayments.SaleResponse();
 *          commercepayments.PaymentMethodTokenizationResponse paymentMethodTokenizationResponse = new commercepayments.PaymentMethodTokenizationResponse();
 *          if(saleRequest.amount!=null )
 *          {
 *              saleResponse.setAmount(saleRequest.amount);
 *          }
 *          else
 *          {
 *               throw new SalesforceValidationException('Required Field Missing : Amount');
 *          }
 *
 *          system.debug('Response - success');
 *          saleResponse.setGatewayDate(system.now());
 *          saleResponse.setGatewayResultCode('00');
 *          saleResponse.setGatewayResultCodeDescription('Transaction Normal');
 *          saleResponse.setGatewayReferenceNumber('SF'+getRandomNumber(6));
 *          saleResponse.setSalesforceResultCodeInfo(SUCCESS_SALESFORCE_RESULT_CODE_INFO);
 *          paymentMethodTokenizationResponse.setGatewayTokenEncrypted(gatewayTokenEncrypted);
 *          saleResponse.setPaymentMethodTokenizationResponse(paymentMethodTokenizationResponse);
 *          return saleResponse;
 *      }
 */
global with sharing class PaymentMethodTokenizationResponse extends commercepayments.AbstractTransactionResponse {
    global Object PaymentMethodTokenizationResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the amount for payment tokenization. Can be positive, negative, or zero.
     */
    global virtual void setAmount(Double amount) { }

    /**
     * Indicates whether the gateway response is received asynchronously (true) or not (false). When set to true, the saved payment method remains in a pending state until the async notification is received.
     */
    global void setAsync(Boolean async) { }

    /**
     * Sets the bank name for payment tokenization.
     */
    global void setBankName(String bankName) { }

    /**
     * Sets the unique hash of the payment method that the gateway returned.
     */
    global void setChecksum(String checksum) { }

    /**
     * Sets the customer reference number that the gateway returned.
     */
    global void setCustomerReference(String customerReference) { }

    /**
     * Sets the AVS (address verification system) result code information that the gateway returned. Maximum length of 64 characters.
     */
    global void setGatewayAvsCode(String gatewayAvsCode) { }

    /**
     * Sets the date that the tokenization occurred. Some gateways don’t send this value.
     */
    global void setGatewayDate(Datetime gatewayDate) { }

    /**
     * Sets error messages that the gateway returned for the tokenization request. Maximum length of 255 characters.
     */
    global void setGatewayMessage(String gatewayMessage) { }

    /**
     * Sets any additional reference details that the gateway returned.
     */
    global void setGatewayReferenceDetails(String gatewayReferenceDetails) { }

    /**
     * Sets the reference number that the gateway returned.
     */
    global virtual void setGatewayReferenceNumber(String gatewayReferenceNumber) { }

    /**
     * Sets a gateway-specific result code. The code may be mapped to a Salesforce-specific result code. Maximum length of 64 characters.
     */
    global void setGatewayResultCode(String gatewayResultCode) { }

    /**
     * Sets a description of the gateway-specific result code that a payment gateway returned. Maximum length of 1000 characters.
     */
    global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) { }

    /**
     * Sets the gateway token value that the gateway returned.
     */
    global void setGatewayToken(String gatewayToken) { }

    /**
     * Sets any additional information that the gateway returned about the payment token.
     */
    global void setGatewayTokenDetails(String gatewayTokenDetails) { }

    /**
     * Sets the value of the gatewayTokenEncrypted field on a CardPaymentMethod or DigitalWallet object.
     */
    global void setGatewayTokenEncrypted(String gatewayTokenEncrypted) { }

    global void setRetryCategory(commercepayments.RetryCategory retryCategory) { }

    global void setRetryDecision(commercepayments.RetryDecision retryDecision) { }

    /**
     * Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
     */
    global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) { }

    global override virtual String toString() { return null; }
}