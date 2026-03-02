/**
 * Stores details of the tax values that an external tax engine calculates in response to a tax calculation request.
 */
public class TaxDetailsResponse {

  public void setExemptAmount(Double exemptAmount) {}

  public void setExemptReason(String reason) {}

  public void setImposition(commercetax.ImpositionResponse imposition) {}

  public void setJurisdiction(commercetax.JurisdictionResponse jurisdiction) {}

  public void setRate(Double rate) {}

  public void setSerCode(String serCode) {}

  public void setTax(Double tax) {}

  public void setTaxAuthorityTypeId(String taxAuthorityTypeId) {}

  public void setTaxId(String taxId) {}

  public void setTaxRegionId(String taxRegionId) {}

  public void setTaxRuleDetails(commercetax.RuleDetailsResponse taxRuleDetails) {}

  public void setTaxableAmount(Double taxableAmount) {}

}