/**
 * Response sent by the payment gateway adapter for a postauthorization service.
 * <p>Usage
 * This class extends <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_class_commercepayments_AbstractTransactionResponse.htm" target="_blank">AbstractTransactionResponse</a>. The constructor of this class takes no arguments. For example:
 * CommercePayments.PostAuthorizationResponse authr = new CommercePayments.PostAuthorizationResponse();
 * Contains information about the payment gateway’s response following an authorization transaction. The gateway adapter uses the payment gateway’s response to populate the PostAuthorizationResponse fields. The payments platform uses the information from this class to settle the transaction.
 */
global with sharing class PostAuthorizationResponse extends commercepayments.AbstractTransactionResponse {
    global Object PostAuthorizationResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the amount for payment authorization. Can be positive, negative, or zero.
     */
    global virtual void setAmount(Double amount) { }

    /**
     * Sets whether the payment capture or authorization is asynchronous (True) or synchronous (False). If True, then the payment or payment authorization record created has a status of Pending.
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
     * Sets details about the payment method.
     */
    global void setPaymentMethodDetails(commercepayments.PaymentMethodDetailsResponse paymentMethodDetails) { }

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