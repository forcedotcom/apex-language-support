/**
 * Captures the address values that are applicable for the quote or order transaction.
 */
global with sharing class HeaderTaxAddressesRequest {
    /**
     * Specifies the billTo address for a line item on which tax was calculated.
     * <p>TaxAddressRequest
     */
    global commercetax.TaxAddressRequest billTo { get; set; }
    /**
     * Specifies the shipFrom address for a line item on which tax was calculated.
     * <p>TaxAddressRequest
     */
    global commercetax.TaxAddressRequest shipFrom { get; set; }
    /**
     * Specifies the shipTo address for a line item on which tax was calculated.
     * <p>TaxAddressRequest
     */
    global commercetax.TaxAddressRequest shipTo { get; set; }
    /**
     * Specifies the soldTo address for a line item on which tax was calculated.
     * <p>TaxAddressRequest
     */
    global commercetax.TaxAddressRequest soldTo { get; set; }
    /**
     * Address used by the tax engine when calculating tax for a line item.
     * <p>TaxAddressRequest
     */
    global commercetax.TaxAddressRequest taxEngineAddress { get; set; }

    /**
     * Constructor for initializing the required addresses of the tax addresses request such as the ship from, ship to, sold to, and bill to addresses. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global HeaderTaxAddressesRequest(commercetax.TaxAddressRequest shipFrom, commercetax.TaxAddressRequest shipTo, commercetax.TaxAddressRequest soldTo, commercetax.TaxAddressRequest billTo, commercetax.TaxAddressRequest taxEngineAddress) { }

    /**
     * Maintains the integrity of lists of type HeaderTaxAddressesRequest by determining the equality of external objects in a list. This method is dynamic and is based on the equals() method in Java.
     */
    global virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type TaxAddressesRequest by determining the uniqueness of the external objects in a list.
     */
    global virtual Integer hashCode() { return 0; }

    /**
     * Converts a value to a string.
     */
    global override virtual String toString() { return null; }
}