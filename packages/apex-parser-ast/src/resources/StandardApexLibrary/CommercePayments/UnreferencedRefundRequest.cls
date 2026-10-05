global with sharing class UnreferencedRefundRequest extends commercepayments.RefundRequest {
    global String accountId { get; set; }
    @AuraEnabled
    global Map additionalData { get; set; }
    global Double amount { get; set; }
    global String comments { get; set; }
    global String currencyIsoCode { get; set; }
    global Boolean duplicate { get; set; }
    global Datetime effectiveDate { get; set; }
    global String email { get; set; }
    global String idempotencyKey { get; set; }
    global String ipAddress { get; set; }
    global String macAddress { get; set; }
    global String paymentGatewayId { get; set; }
    global commercepayments.UnreferencedRefundPaymentMethodRequest paymentMethod { get; set; }
    @AuraEnabled
    global Map paymentMethodData { get; set; }
    global String phone { get; set; }

    global UnreferencedRefundRequest(Double amount, commercepayments.UnreferencedRefundPaymentMethodRequest paymentMethod) { }

    global override virtual Boolean equals(Object obj) { return false; }

    global override virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}