/**
 * Represents a payment method.
 */
global class PaymentMethod {

  global PaymentMethod(String network, String paymentType, String displayName) {}

  global String displayName;

  global String network;

  global String paymentType;

  global Object clone() {}

}