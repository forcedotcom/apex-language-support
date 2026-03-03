/**
 * Sets the tax address fields based on a response from the external tax engine. Contains setter methods for the Ship From, Ship To, and Sold To addresses.
 */
global class AddressesResponse {

  global void setShipFrom(commercetax.AddressResponse shipFrom) {}

  global void setShipTo(commercetax.AddressResponse shipTo) {}

  global void setSoldTo(commercetax.AddressResponse soldTo) {}

}