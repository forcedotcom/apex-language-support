/**
 * Response sent by the payment gateway following a payment authorization reversal service.
 * <p>Usage
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.AuthorizationReversalResponse authRevRes = new CommercePayments.AuthorizationResponse();
 * Contains information about the payment gateway’s response following an authorization reversal transaction. The gateway adapter uses the payment gateway’s response to populate the AuthorizationReversalResponse fields. The payments platform uses the information from this class to construct the authorization gateway response shown to the user.
 * <p>Example
 * This class builds an authorization reversal response that contains the amount of the original reversal request, gateway information, and the Salesforce result code.
 * global commercepayments.GatewayResponse createAuthReversalResponse(commercepayments.AuthorizationReversalRequest authReversalRequest) {
 *         commercepayments.AuthorizationReversalResponse authReversalResponse = new commercepayments.AuthorizationReversalResponse();
 *         if(authReversalRequest.amount!=null )
 *         {
 *             authReversalResponse.setAmount(authReversalRequest.amount);
 *         }
 *         else
 *         {
 *              throw new SalesforceValidationException('Required Field Missing : Amount');
 *         }
 *
 *         system.debug('Response - success');
 *         authReversalResponse.setGatewayDate(system.now());
 *         authReversalResponse.setGatewayResultCode('00');
 *         authReversalResponse.setGatewayResultCodeDescription('Transaction Normal');
 *         authReversalResponse.setGatewayReferenceNumber('SF'+getRandomNumber(6));
 *         authReversalResponse.setSalesforceResultCodeInfo(SUCCESS_SALESFORCE_RESULT_CODE_INFO);
 *         return authReversalResponse;
 *     }
 */
global with sharing class AuthorizationReversalResponse extends commercepayments.AbstractTransactionResponse {
    global AuthorizationReversalResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Contains the amount of the authorization reversal. Must be a non-zero value.
     */
    global virtual void setAmount(Double amount) { }

    /**
     * Sets the AVS (Address Verification System) result code that the gateway returned. Maximum length of 64 characters.
     */
    global void setGatewayAvsCode(String gatewayAvsCode) { }

    /**
     * Sets the date that the authorization reversal request occurred in the payment gateway. Some gateways don't send this value.
     */
    global void setGatewayDate(Datetime gatewayDate) { }

    /**
     * Sets error messages that the gateway returned for the authorization reversal request. Maximum length of 255 characters.
     */
    global void setGatewayMessage(String gatewayMessage) { }

    /**
     * Stores data that you can use for subsequent authorizations. You can use any data that isn’t normalized in financial entities. This field has a maximum length of 1000 characters and can store data as JSON or XML.
     */
    global void setGatewayReferenceDetails(String gatewayReferenceDetails) { }

    /**
     * Sets a unique gateway reference number for the transaction that the gateway returned. Maximum length of 255 characters.
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

    global void setRetryCategory(commercepayments.RetryCategory retryCategory) { }

    global void setRetryDecision(commercepayments.RetryDecision retryDecision) { }

    /**
     * Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
     */
    global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) { }

    global override virtual String toString() { return null; }
}