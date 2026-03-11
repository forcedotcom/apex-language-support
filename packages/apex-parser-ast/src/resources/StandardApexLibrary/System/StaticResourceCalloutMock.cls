/**
 * Utility class used to specify a fake response for testing HTTP callouts.
 */
global class StaticResourceCalloutMock {

  /**
   * Sets the specified header name and value for the fake response.
   * @param headerName 
   * @param headerValue 
   */
  public void setHeader(String headerName, String headerValue) {}

  /**
   * Sets the specified static resource, which contains the response body.
   * @param resourceName 
   */
  public void setStaticResource(String resourceName) {}

  /**
   * Sets the specified HTTP status for the response.
   * @param httpStatus 
   */
  public void setStatus(String httpStatus) {}

  /**
   * Sets the specified HTTP status for the response.
   * @param httpStatusCode 
   */
  public void setStatusCode(Integer httpStatusCode) {}

}