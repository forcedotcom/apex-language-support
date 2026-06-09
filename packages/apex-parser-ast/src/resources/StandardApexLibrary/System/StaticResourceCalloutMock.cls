/**
 * Utility class used to specify a fake response for testing HTTP callouts.
 */
global class StaticResourceCalloutMock {

  global StaticResourceCalloutMock() {}

  /**
   * Sets the specified header name and value for the fake response.
   * @param headerName 
   * @param headerValue 
   */
  global void setHeader(String headerName, String headerValue) {}

  /**
   * Sets the specified static resource, which contains the response body.
   * @param resourceName 
   */
  global void setStaticResource(String resourceName) {}

  /**
   * Sets the specified HTTP status for the response.
   * @param httpStatus 
   */
  global void setStatus(String httpStatus) {}

  /**
   * Sets the specified HTTP status for the response.
   * @param httpStatusCode 
   */
  global void setStatusCode(Integer httpStatusCode) {}

  global Object clone() {}

  global System.HttpResponse respond(System.HttpRequest request) {}

}