/**
 * Response class that stores details of a list of one or more line items on which the tax engine has calculated tax.
 */
global class LineItemResponse {

  global void setAddresses(commercetax.AddressesResponse addresses) {}

  global void setAmountDetails(commercetax.AmountDetailsResponse amountDetails) {}

  global void setCustomTaxAttributes(commercetax.CustomTaxAttributesResponse customTaxAttributes) {}

  global void setEffectiveDate(Datetime effectiveDate) {}

  global void setIsTaxable(Boolean isTaxable) {}

  global void setLineNumber(String lineNumber) {}

  global void setProductCode(String productCode) {}

  global void setQuantity(Double quantity) {}

  global void setTaxCode(String taxCode) {}

  global void setTaxes(List<commercetax.TaxDetailsResponse> taxes) {}

}