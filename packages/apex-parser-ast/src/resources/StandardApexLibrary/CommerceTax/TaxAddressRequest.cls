/**
 * Contains address details used for tax calculation.
 */
global with sharing class TaxAddressRequest {
    /**
     * City used in an address, which is required for tax calculation.
     * <p>String
     */
    global String city { get; set; }
    /**
     * Country used in an address, which is required for tax calculation.
     * <p>String
     */
    global String country { get; set; }
    /**
     * Country code used in an address, which is required for tax calculation.
     * <p>String
     */
    global String countryCode { get; set; }
    /**
     * Latitude used in an address, which is required for tax calculation.
     * <p>Double
     */
    global Double latitude { get; set; }
    /**
     * Location code used in an address, which is required for tax calculation.
     * <p>String
     */
    global String locationCode { get; set; }
    /**
     * Longitude used in an address, which is required for tax calculation.
     * <p>Double
     */
    global Double longitude { get; set; }
    /**
     * Postal code used in an address, which is required for tax calculation.
     * <p>String
     */
    global String postalCode { get; set; }
    /**
     * State used in an address, which is required for tax calculation.
     * <p>String
     */
    global String state { get; set; }
    /**
     * State code used in an address, which is required for tax calculation.
     * <p>String
     */
    global String stateCode { get; set; }
    /**
     * Street used in an address, which is required for tax calculation.
     * <p>String
     */
    global String street { get; set; }

    /**
     * Initializes the TaxAddressRequest object using address details. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global Object TaxAddressRequest(String city, String country, Double latitude, Double longitude, String postalCode, String state, String street, String locationCode) { return null; }

    /**
     * Maintains the integrity of lists of type TaxAddressRequest by determining the equality of external objects in a list. This method is dynamic and based on the equals() method in Java.
     */
    global virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type TaxAddressRequest by determining the uniqueness of the external object in a list.
     */
    global virtual Integer hashCode() { return 0; }

    /**
     * Converts a date to a string.
     */
    global override virtual String toString() { return null; }
}