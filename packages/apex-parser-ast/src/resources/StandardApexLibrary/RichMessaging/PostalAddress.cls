/**
 * Represents the postal address.
 */
global class PostalAddress {
    /**
     * The street address.
     * <p>List<String>
     */
    @InvocableVariable
    global List addressLines;
    /**
     * The administrative area.
     * <p>String
     */
    @InvocableVariable
    global String administrativeArea;
    /**
     * The country.
     * <p>String
     */
    @InvocableVariable
    global String country;
    /**
     * The country code.
     * <p>String
     */
    @InvocableVariable
    global String countryCode;
    /**
     * The locality of the address.
     * <p>String
     */
    @InvocableVariable
    global String locality;
    /**
     * The postal code.
     * <p>String
     */
    @InvocableVariable
    global String postalCode;
    /**
     * The sub-administrative area.
     * <p>String
     */
    @InvocableVariable
    global String subAdministrativeArea;
    /**
     * The sub-locality of the address.
     * <p>String
     */
    @InvocableVariable
    global String subLocality;

    /**
     * Creates a new instance of the RichMessaging.PostalAddress class.
     */
    global Object PostalAddress(List addressLines, String subLocality, String locality, String postalCode, String subAdministrativeArea, String administrativeArea, String country, String countryCode) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}