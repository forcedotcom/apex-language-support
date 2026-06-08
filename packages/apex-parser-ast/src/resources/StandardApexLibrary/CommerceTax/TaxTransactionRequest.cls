/**
 * Abstract class for storing customer details used in tax calculation and estimation requests.
 */
global class TaxTransactionRequest {

  global TaxTransactionRequest(commercetax.HeaderTaxAddressesRequest addresses, String currencyIsoCode, commercetax.TaxCustomerDetailsRequest customerDetails, String description, String documentCode, String referenceDocumentCode, Datetime transactionDate, Datetime effectiveDate, List<commercetax.TaxLineItemRequest> lineItems, String referenceEntityId, commercetax.TaxSellerDetailsRequest sellerDetails, Map<String,Object> customTaxAttributes) {}

  global commercetax.HeaderTaxAddressesRequest addresses;

  global String currencyIsoCode;

  global CommerceTax.TaxCustomerDetailsRequest customerDetails;

  global Object customTaxAttributes;

  global String description;

  global String documentCode;

  global Datetime effectiveDate;

  global List<CommerceTax.TaxLineItemRequest> lineItems;

  global String referenceDocumentCode;

  global String referenceEntityId;

  global commercetax.TaxSellerDetailsRequest sellerDetails;

  global Datetime transactionDate;

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

  global Object clone() {}

}