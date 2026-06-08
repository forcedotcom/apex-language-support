/**
 * Sends enhanced payment data, including Level 2 and Level 3 fields, to the gateway adapter as part of the service call.
 */
global class EnhancedPaymentDataInput {

  global EnhancedPaymentDataInput() {}

  public Map<String,String> additionalAttributes;

  public Double discountAmount;

  public Double dutyAmount;

  public String invoiceNumber;

  public List<commercepayments.LineItemInput> lineItems;

  public String referenceId;

  public Double salesTaxAmount;

  public String shipFromZip;

  public String shipToCountry;

  public String shipToZip;

  public Double shippingAmount;

  public Double taxRate;

  public Double totalTaxAmount;

  public Boolean equals(Object obj) {}

  public Integer hashCode() {}

  public String toString() {}

  global Object clone() {}

}