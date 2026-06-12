/**
 * Address for a Commerce account.
 */
global class CommerceAddressOutput {

  global CommerceAddressOutput() {}

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

  global Object clone() {}

  global String getAddressId() {}

  global String getAddressType() {}

  global String getCity() {}

  global String getCompanyName() {}

  global String getCountry() {}

  global String getCountryCode() {}

  global Map<String,ConnectApi.RecordField> getFields() {}

  global String getFirstName() {}

  global Boolean getIsDefault() {}

  global String getLastName() {}

  global String getMiddleName() {}

  global String getName() {}

  global String getPhoneNumber() {}

  global String getPostalCode() {}

  global String getRegion() {}

  global String getRegionCode() {}

  global String getStreet() {}

  global void setAddressId(String value) {}

  global void setAddressType(String value) {}

  global void setCity(String value) {}

  global void setCompanyName(String value) {}

  global void setCountry(String value) {}

  global void setCountryCode(String value) {}

  global void setFields(Map<String,ConnectApi.RecordField> value) {}

  global void setFirstName(String value) {}

  global void setIsDefault(Boolean value) {}

  global void setLastName(String value) {}

  global void setMiddleName(String value) {}

  global void setName(String value) {}

  global void setPhoneNumber(String value) {}

  global void setPostalCode(String value) {}

  global void setRegion(String value) {}

  global void setRegionCode(String value) {}

  global void setStreet(String value) {}

}