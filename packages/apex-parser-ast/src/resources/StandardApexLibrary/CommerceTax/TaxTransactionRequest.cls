/**
 * Abstract class for storing customer details used in tax calculation and estimation requests.
 */
global class TaxTransactionRequest {

  global TaxTransactionRequest(commercetax.HeaderTaxAddressesRequest addresses, String currencyIsoCode, commercetax.TaxCustomerDetailsRequest customerDetails, String description, String documentCode, String referenceDocumentCode, Datetime transactionDate, Datetime effectiveDate, List<commercetax.TaxLineItemRequest> lineItems, String referenceEntityId, commercetax.TaxSellerDetailsRequest sellerDetails, Map<String,Object> customTaxAttributes) {}

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

}