/**
 * Sets the values of the tax transaction following a response from the external tax engine. Extends the AbstractTransactionResponse class and is the top-level response class.
 */
public class CalculateTaxResponse {

  public void setAddresses(commercetax.AddressesResponse addresses) {}

  public void setAmountDetails(commercetax.AmountDetailsResponse amountDetails) {}

  public void setCurrencyIsoCode(String currencyIsoCode) {}

  public void setDescription(String dscptn) {}

  public void setDocumentCode(String documentCode) {}

  public void setEffectiveDate(Datetime effectiveDate) {}

  public void setLineItems(List<commercetax.LineItemResponse> lineItems) {}

  public void setReferenceDocumentCode(String referenceDocumentCode) {}

  public void setReferenceEntityId(String referenceEntityId) {}

  public void setStatus(commercetax.TaxTransactionStatus status) {}

  public void setStatusDescription(String statusDescription) {}

  public void setTaxTransactionId(String taxTrxnId) {}

  public void setTaxTransactionType(commercetax.TaxTransactionType taxTransactionType) {}

  public void setTaxType(commercetax.CalculateTaxType taxType) {}

  public void setTransactionDate(Datetime transactionDate) {}

}