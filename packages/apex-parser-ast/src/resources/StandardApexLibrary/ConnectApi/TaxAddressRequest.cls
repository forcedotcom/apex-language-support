/**
 * Address input representation for tax calculation.
 */
global class TaxAddressRequest {

  global TaxAddressRequest() {}

  /**
   * City.
   */
  global String city;

  /**
   * Country.
   */
  global String country;

  /**
   * Latitude.
   */
  global Double latitude;

  /**
   * Location code.
   */
  global String locationCode;

  /**
   * Longitude.
   */
  global Double longitude;

  /**
   * Postal code.
   */
  global String postalCode;

  /**
   * State.
   */
  global String state;

  /**
   * Street.
   */
  global String street;

  global Object clone() {}

}