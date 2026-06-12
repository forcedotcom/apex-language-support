/**
 * Sets tax amount fields based on a response from the external tax engine.
 */
global class AmountDetailsResponse {

  global AmountDetailsResponse() {}

  global void setExemptAmount(Double exemptAmount) {}

  global void setTaxAmount(Double taxAmount) {}

  global void setTotalAmount(Double totalAmount) {}

  global void setTotalAmountWithTax(Double totalAmtWithTax) {}

  global Object clone() {}

  global java:commerce.tax.impl.engine.integration.response.AmountDetailsEngineResponse getDelegate() {}

}