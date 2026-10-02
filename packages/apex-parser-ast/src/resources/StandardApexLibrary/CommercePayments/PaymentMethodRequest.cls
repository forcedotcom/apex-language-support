global with sharing class PaymentMethodRequest {
    global commercepayments.AddressRequest address { get; set; }
    global commercepayments.CardPaymentMethodRequest cardPaymentMethod { get; set; }
    global String id { get; set; }

    global Object PaymentMethodRequest(commercepayments.CardPaymentMethodRequest cardPaymentMethodRequest) { return null; }

    global virtual Boolean equals(Object obj) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}