global with sharing class UnreferencedRefundPaymentMethodRequest extends commercepayments.BaseApiPaymentMethodRequest {
    global commercepayments.AddressRequest address { get; set; }
    global commercepayments.CardPaymentMethodRequest cardPaymentMethod { get; set; }
    global String id { get; set; }
    global commercepayments.PaymentMethodIdType idType { get; set; }
    global Boolean saveForFuture { get; set; }

    global Object UnreferencedRefundPaymentMethodRequest() { return null; }

    global Object UnreferencedRefundPaymentMethodRequest(commercepayments.CardPaymentMethodRequest cardPaymentMethodRequest) { return null; }

    global override virtual Boolean equals(Object obj) { return false; }

    global override virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}