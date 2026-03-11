/**
 * Address for a Commerce account.
 */
global class CommerceAddressOutput {

  /**
   * ID of the address.
   */
  global String addressId;

  /**
   * Type of address (for example, “Shipping” or “Billing”).
   */
  global String addressType;

  /**
   * The address city.
   */
  global String city;

  /**
   * The address company name.
   */
  global String companyName;

  /**
   * The address country.
   */
  global String country;

  /**
   * Two-character country code.
   */
  global String countryCode;

  /**
   * A list of custom address fields, if any.
   */
  global Map < String , Record Field > fields;

  /**
   * The address first name.
   */
  global String firstName;

  /**
   * Indicates whether a contact’s address is the preferred method of communication ( true ) or not ( false ). The default value is false .
   */
  global Boolean isDefault;

  /**
   * The address last name.
   */
  global String lastName;

  /**
   * The address middle name.
   */
  global String middleName;

  /**
   * Name of the contact.
   */
  global String name;

  /**
   * The address phone number.
   */
  global String phoneNumber;

  /**
   * Zip code or postal code for the address.
   */
  global String postalCode;

  /**
   * The address state.
   */
  global String region;

  /**
   * The address state code.
   */
  global String regionCode;

  /**
   * The address street.
   */
  global String street;

}