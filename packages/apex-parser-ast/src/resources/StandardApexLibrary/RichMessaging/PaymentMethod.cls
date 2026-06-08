/**
 * Represents a payment method.
 */
global class PaymentMethod {

  public PaymentMethod(String network, String paymentType, String displayName) {}

  public String displayName;

  public String network;

  public String paymentType;

  global Object clone() {}

}