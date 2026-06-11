/**
 * Represents a request to process a payment.
 */
global class ProcessPaymentRequest {

  global ProcessPaymentRequest(String transactionIdentifier, String paymentData, RichMessaging.AddressableContact billingContact, RichMessaging.AddressableContact shippingContact, RichMessaging.PaymentMethod paymentMethod, RichMessaging.ShippingMethod shippingMethod, String contextRecordId) {}

  global RichMessaging.AddressableContact billingContact;

  global String contextRecordId;

  global String paymentData;

  global RichMessaging.PaymentMethod paymentMethod;

  global RichMessaging.AddressableContact shippingContact;

  global RichMessaging.ShippingMethod shippingMethod;

  global String transactionIdentifier;

  global Object clone() {}

}