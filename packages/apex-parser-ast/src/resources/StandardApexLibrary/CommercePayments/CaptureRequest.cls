/**
 * Represents a capture request. This class extends the BaseRequest class and inherits all its methods.
 * <p>Usage
 * The CaptureRequest class’s buildCaptureRequest method creates a CaptureRequest object to store payment information, such as value and currency, as JSON strings.
 * <p>Example
 * Builds a CaptureRequest object for a multicurrency org.
 *     private String buildCaptureRequest(commercepayments.CaptureRequest captureRequest) {
 *         Boolean IS_MULTICURRENCY_ORG = UserInfo.isMultiCurrencyOrganization();
 *         QueryUtils qBuilderForAuth = new QueryUtils(PaymentAuthorization.SObjectType);
 *         // Add required fields
 *         qBuilderForAuth.getSelectClause().addField('GatewayRefNumber', false);
 *         if (IS_MULTICURRENCY_ORG) {
 *             // addField also takes a boolean to enable translation (uses label instead of actual value)
 *             qBuilderForAuth.getSelectClause().addField('CurrencyIsoCode', false);
 *         }
 */
global with sharing class CaptureRequest extends commercepayments.BaseRequest {
    /**
     * Account ID value. References an account record.
     * <p>String
     */
    global String accountId { get; set; }
    @AuraEnabled
    global Map additionalData { get; set; }
    /**
     * Amount of currency that needs to be captured.
     * <p>Double
     */
    global Double amount { get; set; }
    global Boolean duplicate { get; set; }
    global String email { get; set; }
    global String idempotencyKey { get; set; }
    global String ipAddress { get; set; }
    global String macAddress { get; set; }
    /**
     * ID value that references a PaymentAuthorization.
     * <p>String
     */
    global String paymentAuthorizationId { get; set; }
    global String phone { get; set; }

    global CaptureRequest(Double amount, String authorizationId) { }

    global override virtual Boolean equals(Object obj) { return false; }

    global override virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}