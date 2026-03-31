/**
 * Represents a payment line item in payment requests sent in enhanced Messaging channels.
 */
global class PaymentLineItem {

  public PaymentLineItem(String label, Double amount, RichMessaging.AbstractTiming timing) {}

  public PaymentLineItem(String label, Double amount) {}

}