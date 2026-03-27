/**
 * Stores details of the tax values that an external tax engine calculates in response to a tax calculation request.
 */
global class TaxDetailsResponse {

  global void setCustomTaxAttributes(commercetax.CustomTaxAttributesResponse customTaxAttributes) {}

  global void setExemptAmount(Double exemptAmount) {}

  global void setExemptReason(String reason) {}

  global void setImposition(commercetax.ImpositionResponse imposition) {}

  global void setJurisdiction(commercetax.JurisdictionResponse jurisdiction) {}

  global void setRate(Double rate) {}

  global void setSerCode(String serCode) {}

  global void setTax(Double tax) {}

  global void setTaxAuthorityTypeId(String taxAuthorityTypeId) {}

  global void setTaxId(String taxId) {}

  global void setTaxRegionId(String taxRegionId) {}

  global void setTaxRuleDetails(commercetax.RuleDetailsResponse taxRuleDetails) {}

  global void setTaxableAmount(Double taxableAmount) {}

}