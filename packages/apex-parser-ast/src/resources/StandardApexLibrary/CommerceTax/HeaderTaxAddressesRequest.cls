/**
 * Captures the address values that are applicable for the quote or order transaction.
 */
global class HeaderTaxAddressesRequest {

  global HeaderTaxAddressesRequest(commercetax.TaxAddressRequest shipFrom, commercetax.TaxAddressRequest shipTo, commercetax.TaxAddressRequest soldTo, commercetax.TaxAddressRequest billTo, commercetax.TaxAddressRequest taxEngineAddress) {}

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

}