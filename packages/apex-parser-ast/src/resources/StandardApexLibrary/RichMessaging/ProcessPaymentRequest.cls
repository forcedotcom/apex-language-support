/**
 * Represents a request to process a payment.
 */
global class ProcessPaymentRequest {

  public ProcessPaymentRequest(String transactionIdentifier, String paymentData, RichMessaging.AddressableContact billingContact, RichMessaging.AddressableContact shippingContact, RichMessaging.PaymentMethod paymentMethod, RichMessaging.ShippingMethod shippingMethod, String contextRecordId) {}

  public RichMessaging.AddressableContact billingContact;

  public String contextRecordId;

  public String paymentData;

  public RichMessaging.PaymentMethod paymentMethod;

  public RichMessaging.AddressableContact shippingContact;

  public RichMessaging.ShippingMethod shippingMethod;

  public String transactionIdentifier;

  global Object clone() {}

}