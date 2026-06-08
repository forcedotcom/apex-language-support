/**
 * Represents a payment line item in payment requests sent in enhanced Messaging channels.
 */
global class PaymentLineItem {

  public PaymentLineItem(String label, Double amount, RichMessaging.AbstractTiming timing) {}

  public PaymentLineItem(String label, Double amount) {}

  public Double amount;

  public Double amountValue;

  public Double automaticReloadPaymentThresholdAmount;

  public Double automaticReloadPaymentThresholdAmountValue;

  public String label;

  public String labelValue;

  public String lineItemType;

  public String status;

  public RichMessaging.PaymentItemStatus statusValue;

  public RichMessaging.AbstractTiming timing;

  public RichMessaging.AbstractTiming timingValue;

  global Object clone() {}

}