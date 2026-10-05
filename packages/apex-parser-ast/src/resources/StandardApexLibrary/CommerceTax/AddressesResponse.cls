/**
 * Sets the tax address fields based on a response from the external tax engine. Contains setter methods for the Ship From, Ship To, and Sold To addresses.
 * <p>Usage
 * Because AddressesResponse contains multiple addresses, we recommend using multiple instances of AddressResponse to set unique values for each address.
 * <p>Example
 * This code sample represents a portion of the code used in a mock tax adapter. In this example, you create three AddressResponse classes, set their location codes, and pass them to the Ship To, Ship From, and Sold To setter methods in AddressesResponse. In an actual implementation, your AddressResponse classes already have a location code based on the response from the external tax engine.
 * commercetax.AddressesResponse addressesRes = new commercetax.AddressesResponse();
 *
 * //AddressResponse containing ShipTo information
 * commercetax.AddressResponse shipToAddress = new commercetax.AddressResponse();
 * shipToAddress.setLocationCode('1234567');
 *
 * //AddressResponse containing ShipFrom information
 * commercetax.AddressResponse shipFromAddress = new commercetax.AddressResponse();
 * shipFromAddress.setLocationCode('84720385');
 *
 * //AddressResponse containing Sold To information
 * commercetax.AddressResponse soldToAddress = new commercetax.AddressResponse();
 * soldToAddress.setLocationCode('92381749');
 *
 * //set values of addressesRes
 * addressesRes.setShipFrom(shipFromAddress);
 * addressesRes.setShipTo(shipToAddress);
 * addressesRes.setSoldTo(soldToAddress);
 */
global with sharing class AddressesResponse {
    global AddressesResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the value of a ShipFrom address field.
     */
    global void setShipFrom(commercetax.AddressResponse shipFrom) { }

    /**
     * Sets the value of a ShipTo address field.
     */
    global void setShipTo(commercetax.AddressResponse shipTo) { }

    /**
     * Sets the value of a SoldTo address field.
     */
    global void setSoldTo(commercetax.AddressResponse soldTo) { }

    global override virtual String toString() { return null; }
}