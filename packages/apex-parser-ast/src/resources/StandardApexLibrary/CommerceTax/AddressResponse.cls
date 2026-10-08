/**
 * Contains a location code sent from the external tax engine.
 * Usage
 * Use the AddressResponse class to set unique values for each address.
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
global with sharing class AddressResponse {
    global AddressResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the value of a LocationCode field.
     */
    global void setLocationCode(String locationCode) { }

    global override virtual String toString() { return null; }
}