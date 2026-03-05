/**
 * Contains line item details of a tax request.
 */
global class TaxLineItemRequest {

  global TaxLineItemRequest(commercetax.LineTaxAddressesRequest addresses, Double amount, String description, String productCode, Double quantity, String lineNumber, String taxCode, Datetime effectiveDate) {}

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

}