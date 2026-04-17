/**
 * A checkout address.
 */
global class AbstractCheckoutAddressInput {

  /**
   * City of the address.
   */
  global String city;

  /**
   * Company name of the address.
   */
  global String companyName;

  /**
   * ISO code of the address country. Must match one of the valid ISO codes defined within the org’s State-Country picklist.
   */
  global String country;

  /**
   * First name of the contact.
   */
  global String firstName;

  /**
   * ID of the address.
   */
  global String id;

  /**
   * Last name of the contact.
   */
  global String lastName;

  /**
   * Name of the contact.
   */
  global String name;

  /**
   * ZIP code of the address.
   */
  global String postalCode;

  /**
   * ISO code of the address region. Must match one of the valid ISO codes defined within the org’s State-Country picklist.
   */
  global String region;

  /**
   * Phone number of the contact.
   */
  global String shipToPhoneNumber;

  /**
   * Street of the address.
   */
  global String street;

}