/**
 * Commerce address input.
 */
global class CommerceAddressInput {

  /**
   * Type of address, for example, Shipping or Billing .
   */
  global String addressType;

  /**
   * The address city.
   */
  global String city;

  /**
   * A list of custom address fields, if any.
   */
  global List < ConnectApi.CommerceAddressFieldInput > commerceAddressFieldInputList;

  /**
   * The address company name.
   */
  global String companyName;

  /**
   * The address country, specified using the ISO country code. For example, US for United States.
   */
  global String country;

  /**
   * Two-character country code. For example, US for United States.
   */
  global String countryCode;

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
   * The phone number associated with the address, including a valid country code. For example, +1xxxxxxxxxx (for a US number).
   */
  global String phoneNumber;

  /**
   * Zip code or postal code for the address.
   */
  global String postalCode;

  /**
   * The address state, specified using the ISO state code. For example, CA for California state.
   */
  global String region;

  /**
   * The address state code. For example, CA for California state.
   */
  global String regionCode;

  /**
   * The address street.
   */
  global String street;

}