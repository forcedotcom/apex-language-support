/**
 * Represents a payment line item in payment requests sent in enhanced Messaging channels.
 */
global class PaymentLineItem {

  global PaymentLineItem(String label, Double amount, RichMessaging.AbstractTiming timing) {}

  global PaymentLineItem(String label, Double amount) {}

  global Double amount;

  global Double amountValue;

  global Double automaticReloadPaymentThresholdAmount;

  global Double automaticReloadPaymentThresholdAmountValue;

  global String label;

  global String labelValue;

  global String lineItemType;

  global String status;

  global RichMessaging.PaymentItemStatus statusValue;

  global RichMessaging.AbstractTiming timing;

  global RichMessaging.AbstractTiming timingValue;

  global Object clone() {}

}