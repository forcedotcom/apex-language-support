/**
 * Sends data related to a refund to the payment gateway adapter.
 * <p>Usage
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.RefundRequest rrq = new CommercePayments.RefundRequest();
 * <p>Example
 * commercepayments.ReferencedRefundRequest refundRequest = new commercepayments.ReferencedRefundRequest(80, pmt.id);
 */
global abstract with sharing class RefundRequest extends commercepayments.BaseRequest {
    @AuraEnabled
    global Map additionalData { get; set; }
    global Boolean duplicate { get; set; }
    global String email { get; set; }
    global String idempotencyKey { get; set; }
    global String ipAddress { get; set; }
    global String macAddress { get; set; }
    global String phone { get; set; }

    /**
     * Maintains the integrity of lists of type RefundRequest by determining the equality of external objects in a list. This method is dynamic and is based on the equals method in Java.
     */
    global override virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type RefundRequest by determining the uniqueness of the external object records in a list.
     */
    global override virtual Integer hashCode() { return 0; }
}