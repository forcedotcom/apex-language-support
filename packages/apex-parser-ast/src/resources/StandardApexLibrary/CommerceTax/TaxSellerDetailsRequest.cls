/**
 * Contains tax code details used in the tax calculation request.
 */
global with sharing class TaxSellerDetailsRequest {
    /**
     * Tax code used for tax calculation.
     * String
     */
    global String code { get; set; }

    /**
     * Initializes the request for the tax seller details. This constructor is intended for test usage and throws an exception if used outside of the Apex test context
     */
    global TaxSellerDetailsRequest(String code) { }

    /**
     * Maintains the integrity of lists of type TaxSellerDetailsRequest by determining the equality of the external objects in a list. This method is dynamic and based on the equals() method in Java.
     */
    global virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type TaxSellerDetailsRequest by determining the uniqueness of the external objects in a list.
     */
    global virtual Integer hashCode() { return 0; }

    /**
     * Converts a value to a string.
     */
    global override virtual String toString() { return null; }
}