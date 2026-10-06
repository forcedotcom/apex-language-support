/**
 * Access information about the referenced refund requests. Extends the RefundRequest class.
 * Example
 * global commercepayments.GatewayResponse processRequest(commercepayments.PaymentGatewayContext gatewayContext) {
 *     commercepayments.RequestType requestType = gatewayContext.getPaymentRequestType();
 *     if (requestType == commercepayments.RequestType.ReferencedRefund) {
 *         commercepayments.*ReferencedRefundRequest* refundRequest = (commercepayments.*ReferencedRefundRequest*) gatewayContext.getPaymentRequest();
 *     }
 * }
 */
global with sharing class ReferencedRefundRequest extends commercepayments.RefundRequest {
    /**
     * References a payment object.
     * String
     */
    global String PaymentId { get; set; }
    /**
     * References an account.
     * String
     */
    global String accountId { get; set; }
    @AuraEnabled
    global Map additionalData { get; set; }
    /**
     * References an amount.
     * Double
     */
    global Double amount { get; set; }
    global Boolean duplicate { get; set; }
    global String email { get; set; }
    global String idempotencyKey { get; set; }
    global String ipAddress { get; set; }
    global String macAddress { get; set; }
    global String phone { get; set; }

    global ReferencedRefundRequest(Double amount, String paymentId) { }

    global override virtual Boolean equals(Object obj) { return false; }

    global override virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}