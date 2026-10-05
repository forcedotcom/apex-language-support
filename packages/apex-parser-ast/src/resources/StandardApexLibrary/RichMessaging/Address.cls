/**
 * Represents a postal address.
 */
global with sharing class Address {
    /**
     * The street address lines variable of the postal address.
     * <p>List<String>
     */
    @InvocableVariable
    global List addressLinesValue;
    /**
     * The administrative area variable of the address.
     * <p>String
     */
    @InvocableVariable
    global String administrativeAreaValue;
    /**
     * The country code variable of the address.
     * <p>String
     */
    @InvocableVariable
    global String countryCodeValue;
    /**
     * The country variable of the address.
     * <p>String
     */
    @InvocableVariable
    global String countryValue;
    /**
     * The locality variable of the postal address.
     * <p>String
     */
    @InvocableVariable
    global String localityValue;
    /**
     * The postal code variable of the address.
     * <p>String
     */
    @InvocableVariable
    global String postalCodeValue;
    /**
     * The sub-administrative area variable of the address.
     * <p>String
     */
    @InvocableVariable
    global String subAdministrativeAreaValue;
    /**
     * The sub-locality variable of the address.
     * <p>String
     */
    @InvocableVariable
    global String subLocalityValue;

    /**
     * The street address lines (street, unit, etc.) of the postal address.
     * <p>List<String>
     */
    @AuraEnabled
    global List addressLines { get; set; }
    /**
     * The administrative area (state or province) of the address.
     * <p>String
     */
    @AuraEnabled
    global String administrativeArea { get; set; }
    /**
     * The country of the address.
     * <p>String
     */
    @AuraEnabled
    global String country { get; set; }
    /**
     * The ISO country code of the address.
     * <p>String
     */
    @AuraEnabled
    global String countryCode { get; set; }
    /**
     * The locality (city) of the postal address.
     * <p>String
     */
    @AuraEnabled
    global String locality { get; set; }
    /**
     * The postal code (zip or postal code) of the address.
     * <p>String
     */
    @AuraEnabled
    global String postalCode { get; set; }
    /**
     * The sub-administrative area (county or other region) of the address.
     * <p>String
     */
    @AuraEnabled
    global String subAdministrativeArea { get; set; }
    /**
     * The sub-locality information associated with the address (defined at the city level).
     * <p>String
     */
    @AuraEnabled
    global String subLocality { get; set; }

    global Address() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}