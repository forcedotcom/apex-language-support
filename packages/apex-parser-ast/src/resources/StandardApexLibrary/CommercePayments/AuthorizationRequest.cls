/**
 * Sends information about an authorization request to a gateway adapter during a service call. This class extends the BaseRequest class and inherits all its methods.
 * <p>Usage
 * This class contains information about a transaction authorization request. The gateway adapter reads fields from this class while constructing an authorization JSON request to send to the payment gateway. An object of this class is available by calling getPaymentRequest() in the PaymentGatewayContext Class.
 * <p>Example
 * Creating a buildAuthRequest class to store information about the authorization request.
 * private String buildAuthRequest(commercepayments.AuthorizationRequest authRequest) {
 *         // Multiply amount by 100.0 to convert to cents
 *         String requestBody = createRequestBody(String.ValueOf((authRequest.amount*100.0).intValue()), authRequest);
 *         return requestBody;
 *
 *         private String createRequestBody(String amount, commercepayments.AuthorizationRequest authRequest) {
 *         JSONGenerator jsonGeneratorInstance = JSON.createGenerator(true);
 *         String currencyIso = authRequest.currencyIsoCode;
 *         commercepayments.AuthApiPaymentMethodRequest paymentMethod = authRequest.paymentMethod;
 *         commercepayments.GatewayErrorResponse error;
 *         // Write data to the JSON string.
 *         jsonGeneratorInstance.writeStartObject();
 *         jsonGeneratorInstance.writeStringField('merchantAccount', '{!$Credential.Username}');
 *         jsonGeneratorInstance.writeStringField('reference', authRequest.comments == null ? 'randomstring' : authRequest.comments);
 *
 *         if(currencyIso == null) {
 *             currencyIso = UserInfo.getDefaultCurrency();
 *         }
 *
 *         jsonGeneratorInstance.writeFieldName('amount');
 *         jsonGeneratorInstance.writeStartObject();
 *         jsonGeneratorInstance.writeStringField('value', amount);
 *         jsonGeneratorInstance.writeStringField('currency', currencyIso);
 *         jsonGeneratorInstance.writeEndObject();
 *
 *         commercepayments.CardPaymentMethodRequest cardPaymentMethod;
 *         if(paymentMethod != null) {
 *             cardPaymentMethod = paymentMethod.cardPaymentMethod;
 *             if (cardPaymentMethod != null) {
 *                 if (cardPaymentMethod.CardCategory != null) {
 *                     if (commercepayments.CardCategory.CreditCard == cardPaymentMethod.CardCategory) {
 *                         jsonGeneratorInstance.writeFieldName('card');
 *                         jsonGeneratorInstance.writeStartObject();
 *                         if (cardPaymentMethod.cvv != null)
 *                             jsonGeneratorInstance.writeStringField('cvc', String.ValueOf(cardPaymentMethod.cvv));
 *                         if (cardPaymentMethod.cardholdername != null)
 *                             jsonGeneratorInstance.writeStringField('holderName', cardPaymentMethod.cardholdername);
 *                         if (cardPaymentMethod.cardnumber != null)
 *                             jsonGeneratorInstance.writeStringField('number', cardPaymentMethod.cardnumber);
 *                         if (cardPaymentMethod.expiryMonth != null && cardPaymentMethod.expiryYear != null ) {
 *                             String expMonth = ((String.ValueOf(cardPaymentMethod.expiryMonth)).length() == 1 ? '0' : '') + String.ValueOf(cardPaymentMethod.expiryMonth);
 *                             jsonGeneratorInstance.writeStringField('expiryMonth', expMonth);
 *                             jsonGeneratorInstance.writeStringField('expiryYear', String.ValueOf(cardPaymentMethod.expiryYear));
 *                         }
 *                         jsonGeneratorInstance.writeEndObject();
 *                     } else {
 *                     //Support for other card type
 *                     }
 *                 } else {
 *                     throw new SampleValidationException('Required Field Missing : CardCategory');
 *                 }
 *             } else {
 *                 throw new SampleValidationException('Required Field Missing : CardPaymentMethod');
 *             }
 *         } else {
 *             throw new SampleValidationException('Required Field Missing : PaymentMethod');
 *         }
 *         jsonGeneratorInstance.writeEndObject();
 *         return jsonGeneratorInstance.getAsString();
 *     }
 */
global with sharing class AuthorizationRequest extends commercepayments.BaseRequest {
    /**
     * The customer account where the authorization is performed.
     * <p>String
     */
    global String accountId { get; set; }
    @AuraEnabled
    global Map additionalData { get; set; }
    /**
     * The total amount of the authorization. Can be positive or negative.
     * <p>Double
     */
    global Double amount { get; set; }
    /**
     * Comments about the authorization. Users can enter comments to provide additional information.
     * <p>String
     */
    global String comments { get; set; }
    /**
     * The ISO currency code for the authorization request.
     * <p>String
     */
    global String currencyIsoCode { get; set; }
    global Boolean duplicate { get; set; }
    global String email { get; set; }
    global String idempotencyKey { get; set; }
    global String ipAddress { get; set; }
    global String macAddress { get; set; }
    /**
     * The payment method used to process the authorization in the authorization request.
     * <p>AuthApiPaymentMethodRequest
     */
    global commercepayments.AuthApiPaymentMethodRequest paymentMethod { get; set; }
    /**
     * Payment method data used in the authorize payment request.
     * <p>This field is populated when AuthorizationInput specifies a saved payment method. Accessible using paymentMethodData on AuthorizationRequest. The map contains these fields from SavedPaymentMethod: GatewayToken, Type, GatewayReference, and StandardEntryCode for direct gateway interaction without querying the database. This field is supported only for saved payment methods of type card.
     * <p>Map<String,String>
     */
    @AuraEnabled
    global Map paymentMethodData { get; set; }
    global String phone { get; set; }

    /**
     * Constructor for building the amount in an authorization request. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global AuthorizationRequest(Double amount) { }

    /**
     * Maintains the integrity of lists of type AuthorizationRequest by determining the equality of external objects in a list. This method is dynamic and based on the equals method in Java.
     */
    global override virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type AuthorizationRequest by determining the uniqueness of the external object in a list.
     */
    global override virtual Integer hashCode() { return 0; }

    /**
     * Converts a date to a string.
     */
    global override virtual String toString() { return null; }
}