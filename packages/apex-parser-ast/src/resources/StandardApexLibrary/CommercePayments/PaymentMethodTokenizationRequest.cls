/**
 * Stores data about a request to tokenize a card payment method. The tokenization process occurs in the payment gateway. This process replaces sensitive customer data, such as a card number or CVV, with unique identification symbols. The symbols are used while the data is handled by Salesforce, the payment gateway, and the customer bank, allowing Salesforce to store the token without storing sensitive customer data.
 * <p>Usage
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.PaymentMethodTokenizationRequest pmtr = new CommercePayments.PaymentMethodTokenizationRequest();
 * This class holds all the required details about the tokenize request. Gateway adapters read the information in this class while constructing a tokenization JSON request, which is sent to the payment gateway.
 * <p>Example
 * The following code is used within your payment gateway adapter Apex class.
 * Use the GatewayResponse class's processRequest method to build responses based on the request type that it receives from an instance of PaymentGatewayContext. If the request type is Tokenize, GatewayResponse calls the createTokenizeResponse method and passes an instance of the PaymentMethodTokenizationRequest class. The passed PaymentMethodTokenizationRequest object contains the address and cardPaymentMethod information that the payment gateway needs to manage the tokenization process. For example:
 * global commercepayments.GatewayResponse processRequest(commercepayments.paymentGatewayContext gatewayContext) {
 *          commercepayments.RequestType requestType = gatewayContext.getPaymentRequestType();
 *          commercepayments.GatewayResponse response;
 *          try
 *          {
 *              if (requestType == commercepayments.RequestType.Tokenize) {
 *                      response = createTokenizeResponse((commercepayments.PaymentMethodTokenizationRequest)gatewayContext.getPaymentRequest());
 *              }
 *              //Add other else if statements for different request types as needed.
 *              return response;
 *          }
 *          catch(SalesforceValidationException e)
 *          {
 *               commercepayments.GatewayErrorResponse error = new commercepayments.GatewayErrorResponse('400', e.getMessage());
 *               return error;
 *          }
 *      }
 *
 * Configure the createTokenizeResponse method to accept an instance of PaymentMethodTokenizationRequest. Then, build an instance of PaymentMethodTokenizationResponse based on the values received from the payment gateway.
 *      public commercepayments.GatewayResponse createTokenizeResponse(commercepayments.PaymentMethodTokenizationRequest tokenizeRequest) {
 *          commercepayments.PaymentMethodTokenizationResponse tokenizeResponse = new commercepayments.PaymentMethodTokenizationResponse();
 *          tokenizeResponse.setGatewayTokenEncrypted(encryptedValue);
 *          tokenizeResponse.setGatewayTokenDetails(tokenDetails);
 *          tokenizeResponse.setGatewayAvsCode(avsCode);
 *          tokenizeResponse.setGatewayMessage(gatewayMessage);
 *          tokenizeResponse.setGatewayResultCode(resultcode);
 *          tokenizeResponse.setGatewayResultCodeDescription(resultCodeDescription);
 *          tokenizeResponse.setSalesforceResultCodeInfo(resultCodeInfo);
 *          tokenizeResponse.setGatewayDate(system.now());
 *          return tokenizeResponse;
 *      }
 * The tokenizeResponse contains the results of the gateway's tokenization process, and if successful, the tokenized value.
 */
global class PaymentMethodTokenizationRequest extends commercepayments.BaseRequest {
    @AuraEnabled
    global Map additionalData { get; set; }
    /**
     * The card payment method address to be tokenized.
     * <p>AddressRequest
     */
    global commercepayments.AddressRequest address { get; set; }
    /**
     * The bank payment method containing data to be tokenized.
     * <p>commercepayments.BankPaymentMethodRequest
     */
    global commercepayments.BankPaymentMethodRequest bankPaymentMethod { get; set; }
    /**
     * The card payment method containing data to be tokenized.
     * <p>CardPaymentMethodRequest
     */
    global commercepayments.CardPaymentMethodRequest cardPaymentMethod { get; set; }
    global Boolean duplicate { get; set; }
    global String email { get; set; }
    global String idempotencyKey { get; set; }
    global String ipAddress { get; set; }
    global String macAddress { get; set; }
    global String phone { get; set; }
    /**
     * Indicates whether the payment method to be tokenized is saved by the marchant (true) or not (false).
     * <p>Boolean
     */
    global Boolean savedByMerchant { get; set; }

    /**
     * The following are constructors for PaymentMethodTokenizationRequest.
     */
    global Object PaymentMethodTokenizationRequest() { return null; }

    /**
     * Payment gateway ID constructor used with paymentMethodTokenizationRequest. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global Object PaymentMethodTokenizationRequest(String paymentGatewayId) { return null; }

    /**
     * Maintains the integrity of lists of type PaymentMethodTokenizationRequest by determining the equality of external objects in a list. This method is dynamic and is based on the equals method in Java.
     */
    global override virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type PaymentMethodTokenizationRequest by determining the uniquness of the external object records in a list.
     */
    global override virtual Integer hashCode() { return 0; }

    /**
     * Converts a date to a string.
     */
    global override virtual String toString() { return null; }
}