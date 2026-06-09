/**
 * Stores details of tax impositions from the external tax engine.
 */
global class ImpositionResponse {

  global ImpositionResponse() {}

  global void setId(String id) {}

  global void setName(String name) {}

  global void setSubType(String subType) {}

  global void setType(String type) {}

  global Object clone() {}

  global java:commerce.tax.impl.engine.integration.response.ImpositionEngineResponse getDelegate() {}

}