/**
 * Response sent by the payment gateway adapter for an authorization service.
 * <p>Usage
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.AuthorizationResponse authr = new CommercePayments.AuthorizationResponse();
 * Contains information about the payment gateway’s response following an authorization transaction. The gateway adapter uses the payment gateway’s response to populate the AuthorizationResponse fields. The payments platform uses the information from this class to construct the authorization gateway response shown to the user.
 * <p>Example
 * private commercepayments.GatewayResponse createAuthResponse(HttpResponse response, Double amount) {
 *         Map<String, Object> mapOfResponseValues = (Map
 *                             <String, Object>) JSON.deserializeUntyped(response.getBody());
 *
 *         commercepayments.AuthorizationResponse authResponse = new commercepayments.AuthorizationResponse();
 *
 *         String resultCode = (String)mapOfResponseValues.get('resultCode');
 *
 *         if(resultCode != null){
 *             system.debug('Response - success');
 *             if(resultCode.equals('Authorised')){
 *                 system.debug('status - authorised');
 *                 authResponse.setGatewayAuthCode((String)mapOfResponseValues.get('authCode'));
 *                 authResponse.setSalesforceResultCodeInfo(new commercepayments.SalesforceResultCodeInfo(commercepayments.SalesforceResultCode.Success));
 *             } else {
 *                 //Sample returns 200 with refused status in some cases
 *                 system.debug('status - refused');
 *                 authResponse.setGatewayResultCodeDescription((String)mapOfResponseValues.get('refusalReason'));
 *                 authResponse.setSalesforceResultCodeInfo(new commercepayments.SalesforceResultCodeInfo(commercepayments.SalesforceResultCode.Decline));
 *             }
 *             authResponse.setGatewayReferenceNumber((String)mapOfResponseValues.get('pspReference'));
 *             authResponse.setAmount(amount);
 *             authResponse.setGatewayDate(system.now());
 *             return authResponse;
 *         } else {
 *             system.debug('Response - failed');
 *             system.debug('Validation error');
 *             String statusCode = (String)mapOfResponseValues.get('errorType');
 *             String message = (String)mapOfResponseValues.get('message');
 *             commercepayments.GatewayErrorResponse error = new commercepayments.GatewayErrorResponse(statusCode, message);
 *             return error;
 *         }
 *     }
 */
global with sharing class AuthorizationResponse extends commercepayments.AbstractTransactionResponse {
    global AuthorizationResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the amount of the authorization. Must be a non-zero value.
     */
    global virtual void setAmount(Double amount) { }

    /**
     * Indicates whether the gateway response is received asynchronously (true) or not (false). When set to true, the authorize payment method remains in a pending state until the async notification is received.
     */
    global void setAsync(Boolean async) { }

    /**
     * Sets the expiration date of the authorization request.
     */
    global void setAuthorizationExpirationDate(Datetime authExpDate) { }

    /**
     * Sets the authorization code that the gateway returned. Maximum length of 64 characters.
     */
    global void setGatewayAuthCode(String gatewayAuthCode) { }

    /**
     * Sets the AVS (address verification system) result code information that the gateway returned. Maximum length of 64 characters.
     */
    global void setGatewayAvsCode(String gatewayAvsCode) { }

    /**
     * Sets the date that the authorization occurred. Some gateways don’t send this value.
     */
    global void setGatewayDate(Datetime gatewayDate) { }

    /**
     * Sets error messages that the gateway returned for the authorization request. Maximum length of 255 characters.
     */
    global void setGatewayMessage(String gatewayMessage) { }

    /**
     * Stores data that you can use for subsequent authorizations. You can use any data that isn’t normalized in financial entities. This field has a maximum length of 1000 characters and can store data as JSON or XML.
     */
    global void setGatewayReferenceDetails(String gatewayReferenceDetails) { }

    /**
     * Sets the unique gateway reference number for the transaction that the gateway returned. Maximum length of 255 characters.
     */
    global virtual void setGatewayReferenceNumber(String gatewayReferenceNumber) { }

    /**
     * Sets a gateway-specific result code. The code can be mapped to a Salesforce-specific result code. Maximum length of 64 characters.
     */
    global void setGatewayResultCode(String gatewayResultCode) { }

    /**
     * Sets a description of the gateway-specific result code that a payment gateway returned. Maximum length of 1000 characters.
     */
    global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) { }

    /**
     * Sets information from the gateway about the tokenized payment method.
     */
    global void setPaymentMethodTokenizationResponse(commercepayments.PaymentMethodTokenizationResponse paymentMethodTokenizationResponse) { }

    global void setRetryCategory(commercepayments.RetryCategory retryCategory) { }

    global void setRetryDecision(commercepayments.RetryDecision retryDecision) { }

    /**
     * Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
     */
    global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) { }

    global override virtual String toString() { return null; }
}