/**
 * Contains methods to get and set tax address values.
 */
global class TaxAddressesRequest {

  global TaxAddressesRequest(commercetax.TaxAddressRequest shipFrom, commercetax.TaxAddressRequest shipTo, commercetax.TaxAddressRequest soldTo, commercetax.TaxAddressRequest billTo, commercetax.TaxAddressRequest taxEngineAddress) {}

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

}