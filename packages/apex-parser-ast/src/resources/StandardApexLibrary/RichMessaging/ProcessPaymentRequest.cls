/**
 * Represents a request to process a payment.
 */
global class ProcessPaymentRequest {
    /**
     * The billing contact information for the payment request.
     * RichMessaging.AddressableContact
     */
    @InvocableVariable
    global RichMessaging.AddressableContact billingContact;
    /**
     * The context record ID associated with the payment request.
     * String
     */
    @InvocableVariable
    global String contextRecordId;
    /**
     * The encrypted payment data for the payment request.
     * String
     */
    @InvocableVariable
    global RichMessaging.EncryptedPaymentData paymentData;
    /**
     * The payment method for the payment request.
     * RichMessaging.PaymentMethod
     */
    @InvocableVariable
    global RichMessaging.PaymentMethod paymentMethod;
    /**
     * The shipping contact information for the payment request.
     * RichMessaging.AddressableContact
     */
    @InvocableVariable
    global RichMessaging.AddressableContact shippingContact;
    /**
     * The shipping method for the payment request.
     * RichMessaging.ShippingMethod
     */
    @InvocableVariable
    global RichMessaging.ShippingMethod shippingMethod;
    /**
     * The transaction identifier associated with the payment request.
     * String
     */
    @InvocableVariable
    global String transactionIdentifier;

    global ProcessPaymentRequest(String transactionIdentifier, RichMessaging.EncryptedPaymentData paymentData, RichMessaging.AddressableContact billingContact, RichMessaging.AddressableContact shippingContact, RichMessaging.PaymentMethod paymentMethod, RichMessaging.ShippingMethod shippingMethod, String contextRecordId) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}