/**
 * Represents a request to process a payment.
 */
global class ProcessPaymentRequest {

  public ProcessPaymentRequest(String transactionIdentifier, String paymentData, RichMessaging.AddressableContact billingContact, RichMessaging.AddressableContact shippingContact, RichMessaging.PaymentMethod paymentMethod, RichMessaging.ShippingMethod shippingMethod, String contextRecordId) {}

}