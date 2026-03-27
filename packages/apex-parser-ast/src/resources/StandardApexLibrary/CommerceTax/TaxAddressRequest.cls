/**
 * Contains address details used for tax calculation.
 */
global class TaxAddressRequest {

  global TaxAddressRequest(String city, String country, Double latitude, Double longitude, String postalCode, String state, String street, String locationCode) {}

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

}