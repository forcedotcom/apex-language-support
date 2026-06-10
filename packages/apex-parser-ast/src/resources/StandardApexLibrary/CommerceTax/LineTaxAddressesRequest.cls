/**
 * Stores details of the addresses applied per line item in a tax calculation request.
 */
global class LineTaxAddressesRequest {

  global LineTaxAddressesRequest(commercetax.TaxAddressRequest shipFrom, commercetax.TaxAddressRequest shipTo, commercetax.TaxAddressRequest soldTo, commercetax.TaxAddressRequest billTo, commercetax.TaxAddressRequest taxEngineAddress) {}

  global commercetax.TaxAddressRequest billTo;

  global commercetax.TaxAddressRequest shipFrom;

  global commercetax.TaxAddressRequest shipTo;

  global commercetax.TaxAddressRequest soldTo;

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

  global Object clone() {}

}