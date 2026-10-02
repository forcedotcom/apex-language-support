/**
 * Sends information about an authorization reversal request to a gateway adapter during a service call.
 * <p>Example
 * Add your reversal classes to your payment gateway adapter. We recommend adding AuthorizationReversal as a possible requestType value when calling processRequest on the gateway’s response.
 * global commercepayments.GatewayResponse processRequest(commercepayments.paymentGatewayContext gatewayContext) {
 *         commercepayments.RequestType requestType = gatewayContext.getPaymentRequestType();
 *         commercepayments.GatewayResponse response;
 *
 *         try {
 *         //add other requestType values here
 *         //..
 *         else if (requestType == commercepayments.RequestType.AuthorizationReversal) {
 *                 response = createAuthReversalResponse((commercepayments.AuthorizationReversalRequest)gatewayContext.getPaymentRequest());}
 *
 *         return response;
 *
 *
 * Then, add a class that sets the amount of the authorization reversal request, as well as gateway information and the Salesforce result code.
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
global with sharing class AuthorizationReversalRequest extends commercepayments.BaseRequest {
    /**
     * References the customer account for the transaction where the authorization reversal was performed.
     * <p>String
     */
    global String accountId { get; set; }
    @AuraEnabled
    global Map additionalData { get; set; }
    /**
     * The total amount of the authorization reversal request. Can be positive or negative.
     * <p>Double
     */
    global Double amount { get; set; }
    global Boolean duplicate { get; set; }
    global String email { get; set; }
    global String idempotencyKey { get; set; }
    global String ipAddress { get; set; }
    global String macAddress { get; set; }
    /**
     * References the payment authorization to be reversed.
     * <p>String
     */
    global String paymentAuthorizationId { get; set; }
    global String phone { get; set; }

    /**
     * Constructor for building the amount in an authorization reversal request. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global Object AuthorizationReversalRequest(Double amount, String authorizationId) { return null; }

    /**
     * Maintains the integrity of lists of type AuthorizationReversalRequest by determining the equality of external objects in a list. This method is dynamic and based on the equals method in Java.
     */
    global override virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type AuthorizationReversalRequest by determining the uniqueness of the external object in a list.
     */
    global override virtual Integer hashCode() { return 0; }

    /**
     * Converts a date to a string.
     */
    global override virtual String toString() { return null; }
}