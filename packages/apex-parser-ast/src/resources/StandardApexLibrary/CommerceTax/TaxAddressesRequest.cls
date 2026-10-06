/**
 * Contains methods to get and set tax address values.
 */
global with sharing class TaxAddressesRequest {
    /**
     * The Bill To address for a line item.
     * TaxAddressRequest
     */
    global commercetax.TaxAddressRequest billTo { get; set; }
    /**
     * The Ship From address for a line item.
     * TaxAddressRequest
     */
    global commercetax.TaxAddressRequest shipFrom { get; set; }
    /**
     * The Ship To address for a line item.
     * TaxAddressRequest
     */
    global commercetax.TaxAddressRequest shipTo { get; set; }
    /**
     * The Sold To address for a line item.
     * TaxAddressRequest
     */
    global commercetax.TaxAddressRequest soldTo { get; set; }
    /**
     * The Tax Engine Address for a line item.
     * TaxAddressRequest
     */
    global commercetax.TaxAddressRequest taxEngineAddress { get; set; }

    /**
     * Constructor for defining addresses for the tax addresses request. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global TaxAddressesRequest(commercetax.TaxAddressRequest shipFrom, commercetax.TaxAddressRequest shipTo, commercetax.TaxAddressRequest soldTo, commercetax.TaxAddressRequest billTo, commercetax.TaxAddressRequest taxEngineAddress) { }

    /**
     * Maintains the integrity of lists of type TaxAddressesRequest by determining the equality of external objects in a list. This method is dynamic and is based on the equals() method in Java.
     */
    global virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type TaxAddressesRequest by determining the uniqueness of the external object records in a list.
     */
    global virtual Integer hashCode() { return 0; }

    /**
     * Converts a value to a string.
     */
    global override virtual String toString() { return null; }
}