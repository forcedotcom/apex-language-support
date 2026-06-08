/**
 * Represents a shipping method listed in payment requests sent in enhanced Messaging channels.
 */
global class ShippingMethod {

  public ShippingMethod(String label, Double amount, String detail, String identifier) {}

  public Double amount;

  public Double amountValue;

  public String detail;

  public String detailValue;

  public String identifier;

  public String identifierValue;

  public String label;

  public String labelValue;

  public String shippingMethodType;

  global Object clone() {}

}