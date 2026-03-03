/**
 * Sets tax amount fields based on a response from the external tax engine.
 */
global class AmountDetailsResponse {

  global void setExemptAmount(Double exemptAmount) {}

  global void setTaxAmount(Double taxAmount) {}

  global void setTotalAmount(Double totalAmount) {}

  global void setTotalAmountWithTax(Double totalAmtWithTax) {}

}