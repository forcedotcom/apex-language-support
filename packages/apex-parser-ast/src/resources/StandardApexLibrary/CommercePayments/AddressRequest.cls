/**
 * Contains address request data that is sent to a gateway adapter during a service call.
 * <p>Usage
 * Contains information about the payment method’s address. Use this information in authorization, sale, and tokenization requests. The payment gateway adapter uses information in an AddressRequest object to construct a JSON request to send to the payment gateway.
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.AddressRequest adr = new CommercePayments.AddressRequest();
 */
global with sharing class AddressRequest {
    /**
     * City of the payment method address.
     * <p>String
     */
    global String city { get; set; }
    /**
     * Company name of the payment method address.
     * <p>String
     */
    global String companyName { get; set; }
    /**
     * Country for the payment method address.
     * <p>String
     */
    global String country { get; set; }
    /**
     * Postal code for the payment method address.
     * <p>String
     */
    global String postalCode { get; set; }
    /**
     * State for the payment method address.
     * <p>String
     */
    global String state { get; set; }
    /**
     * Street for the payment method address.
     * <p>String
     */
    global String street { get; set; }

    /**
     * Constructs a sample address. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global Object AddressRequest(String street, String city, String state, String country, String postalCode) { return null; }

    /**
     * Maintains the integrity of lists of type AddressRequest by determining the equality of external objects in a list. This method is dynamic and is based on the equals method in Java.
     */
    global virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type AddressRequest.
     */
    global virtual Integer hashCode() { return 0; }

    /**
     * Converts a date to a string.
     */
    global override virtual String toString() { return null; }
}