/**
 * Sets the tax address fields based on a response from the external tax engine. Contains setter methods for the Ship From, Ship To, and Sold To addresses.
 */
global class AddressesResponse {

  global AddressesResponse() {}

  global void setShipFrom(commercetax.AddressResponse shipFrom) {}

  global void setShipTo(commercetax.AddressResponse shipTo) {}

  global void setSoldTo(commercetax.AddressResponse soldTo) {}

  global Object clone() {}

  global java:commerce.tax.impl.engine.integration.response.AddressesEngineResponse getDelegate() {}

}