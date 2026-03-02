/**
 * Utility class used to specify a fake response using multiple resources for testing HTTP callouts.
 */
public class MultiStaticResourceCalloutMock {

  /**
   * Sets the specified header name and value for the fake response.
   * @param headerName 
   * @param headerValue 
   * @return Void
   */
  public Void setHeader(String headerName, String headerValue) {}

  /**
   * Sets the specified static resource corresponding to the endpoint. The static resource contains the response body.
   * @param endpoint 
   * @param resourceName 
   * @return Void
   */
  public Void setStaticResource(String endpoint, String resourceName) {}

  /**
   * Sets the specified HTTP status for the response.
   * @param httpStatus 
   * @return Void
   */
  public Void setStatus(String httpStatus) {}

  /**
   * Sets the specified HTTP status code for the response.
   * @param httpStatusCode 
   * @return Void
   */
  public Void setStatusCode(Integer httpStatusCode) {}

}