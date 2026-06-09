/**
 * Represents an addressable contact.
 */
global class AddressableContact {

  global AddressableContact(String givenName, String phoneticGivenName, String familyName, String phoneticFamilyName, String emailAddress, String phoneNumber, RichMessaging.PostalAddress postalAddress) {}

  global String emailAddress;

  global String familyName;

  global String givenName;

  global String phoneNumber;

  global String phoneticFamilyName;

  global String phoneticGivenName;

  global RichMessaging.PostalAddress postalAddress;

  global Object clone() {}

}