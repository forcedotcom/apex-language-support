/**
 * Utility class used to specify a fake response using multiple resources for testing HTTP callouts.
 */
global class MultiStaticResourceCalloutMock {

  /**
   * Sets the specified header name and value for the fake response.
   * @param headerName 
   * @param headerValue 
   */
  public void setHeader(String headerName, String headerValue) {}

  /**
   * Sets the specified static resource corresponding to the endpoint. The static resource contains the response body.
   * @param endpoint 
   * @param resourceName 
   */
  public void setStaticResource(String endpoint, String resourceName) {}

  /**
   * Sets the specified HTTP status for the response.
   * @param httpStatus 
   */
  public void setStatus(String httpStatus) {}

  /**
   * Sets the specified HTTP status code for the response.
   * @param httpStatusCode 
   */
  public void setStatusCode(Integer httpStatusCode) {}

}