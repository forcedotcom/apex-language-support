/**
 * Response class that stores details of a list of one or more line items on which the tax engine has calculated tax.
 */
public class LineItemResponse {

  public void setAddresses(commercetax.AddressesResponse addresses) {}

  public void setAmountDetails(commercetax.AmountDetailsResponse amountDetails) {}

  public void setEffectiveDate(Datetime effectiveDate) {}

  public void setIsTaxable(Boolean isTaxable) {}

  public void setLineNumber(String lineNumber) {}

  public void setProductCode(String productCode) {}

  public void setQuantity(Double quantity) {}

  public void setTaxCode(String taxCode) {}

  public void setTaxes(List<commercetax.TaxDetailsResponse> taxes) {}

}