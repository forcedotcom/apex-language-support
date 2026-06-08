/**
 * Represents an addressable contact.
 */
global class AddressableContact {

  public AddressableContact(String givenName, String phoneticGivenName, String familyName, String phoneticFamilyName, String emailAddress, String phoneNumber, RichMessaging.PostalAddress postalAddress) {}

  public String emailAddress;

  public String familyName;

  public String givenName;

  public String phoneNumber;

  public String phoneticFamilyName;

  public String phoneticGivenName;

  public RichMessaging.PostalAddress postalAddress;

  global Object clone() {}

}