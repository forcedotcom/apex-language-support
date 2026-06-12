/**
 * Wrapper class that stores details about the type of a tax calculation request.
 */
global class TaxEngineContext {

  global TaxEngineContext() {}

  global String getNamedUri() {}

  global commercetax.TaxEngineRequest getRequest() {}

  global commercetax.RequestType getRequestType() {}

  global Object clone() {}

}