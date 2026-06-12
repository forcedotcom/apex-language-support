/**
 * Sends enhanced payment data, including Level 2 and Level 3 fields, to the gateway adapter as part of the service call.
 */
global class EnhancedPaymentDataInput {

  global EnhancedPaymentDataInput() {}

  global Map<String,String> additionalAttributes;

  global Double discountAmount;

  global Double dutyAmount;

  global String invoiceNumber;

  global List<commercepayments.LineItemInput> lineItems;

  global String referenceId;

  global Double salesTaxAmount;

  global String shipFromZip;

  global String shipToCountry;

  global String shipToZip;

  global Double shippingAmount;

  global Double taxRate;

  global Double totalTaxAmount;

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

  global Object clone() {}

}