/**
 * Contains line item details of a tax request.
 */
global class TaxLineItemRequest {

  global TaxLineItemRequest(commercetax.LineTaxAddressesRequest addresses, Double amount, String description, String productCode, Double quantity, String lineNumber, String taxCode, Datetime effectiveDate) {}

  global commercetax.LineTaxAddressesRequest addresses;

  global Double amount;

  global Object customTaxAttributes;

  global String description;

  global Datetime effectiveDate;

  global String lineNumber;

  global String productCode;

  global String productSKU;

  global Double quantity;

  global String referenceDocumentCode;

  global String taxCode;

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

  global Object clone() {}

}