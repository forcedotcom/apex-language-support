/**
 * Stores details from the external tax engine about the tax jurisdiction used in the tax calculation process. A tax jurisdiction represents a government entity that collects tax.
 */
global class JurisdictionResponse {

  global JurisdictionResponse() {}

  global void setCountry(String country) {}

  global void setId(String id) {}

  global void setLevel(String level) {}

  global void setName(String name) {}

  global void setRegion(String region) {}

  global void setStateAssignedNumber(String stateAssignedNo) {}

  global Object clone() {}

  global java:commerce.tax.impl.engine.integration.response.JurisdictionEngineResponse getDelegate() {}

}