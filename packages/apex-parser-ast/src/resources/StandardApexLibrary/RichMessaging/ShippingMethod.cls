/**
 * Represents a shipping method listed in payment requests sent in enhanced Messaging channels.
 */
global class ShippingMethod {

  global ShippingMethod(String label, Double amount, String detail, String identifier) {}

  global Double amount;

  global Double amountValue;

  global String detail;

  global String detailValue;

  global String identifier;

  global String identifierValue;

  global String label;

  global String labelValue;

  global String shippingMethodType;

  global Object clone() {}

}