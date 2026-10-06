/**
 * Represents the postal address.
 */
global class PostalAddress {
    /**
     * The street address.
     * List<String>
     */
    @InvocableVariable
    global List addressLines;
    /**
     * The administrative area.
     * String
     */
    @InvocableVariable
    global String administrativeArea;
    /**
     * The country.
     * String
     */
    @InvocableVariable
    global String country;
    /**
     * The country code.
     * String
     */
    @InvocableVariable
    global String countryCode;
    /**
     * The locality of the address.
     * String
     */
    @InvocableVariable
    global String locality;
    /**
     * The postal code.
     * String
     */
    @InvocableVariable
    global String postalCode;
    /**
     * The sub-administrative area.
     * String
     */
    @InvocableVariable
    global String subAdministrativeArea;
    /**
     * The sub-locality of the address.
     * String
     */
    @InvocableVariable
    global String subLocality;

    /**
     * Creates a new instance of the RichMessaging.PostalAddress class.
     */
    global PostalAddress(List addressLines, String subLocality, String locality, String postalCode, String subAdministrativeArea, String administrativeArea, String country, String countryCode) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}