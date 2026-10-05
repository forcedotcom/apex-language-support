/**
 * Represents an addressable contact.
 */
global class AddressableContact {
    /**
     * The contact’s email address.
     * <p>String
     */
    @InvocableVariable
    global String emailAddress;
    /**
     * The contact’s surname.
     * <p>String
     */
    @InvocableVariable
    global String familyName;
    /**
     * The contact’s first name.
     * <p>String
     */
    @InvocableVariable
    global String givenName;
    /**
     * The contact’s phone number.
     * <p>String
     */
    @InvocableVariable
    global String phoneNumber;
    /**
     * The phonetic spelling of the contact’s surname.
     * <p>String
     */
    @InvocableVariable
    global String phoneticFamilyName;
    /**
     * The phonetic spelling of the contact’s first name.
     * <p>String
     */
    @InvocableVariable
    global String phoneticGivenName;
    /**
     * The contact’s postal address.
     * <p>RichMessaging.PostalAddress
     */
    @InvocableVariable
    global RichMessaging.PostalAddress postalAddress;

    /**
     * Creates a new instance of the RichMessaging.AddressableContact class.
     */
    global AddressableContact(String givenName, String phoneticGivenName, String familyName, String phoneticFamilyName, String emailAddress, String phoneNumber, RichMessaging.PostalAddress postalAddress) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}