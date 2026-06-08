/**
 * Represents an object used to pass data from an Apex RESTful Web service method to an HTTP response.
 */
global class RestResponse {

  global RestResponse() {}

  public Blob responseBody;

  public Map<String, String> headers;

  public Integer statuscode;

  /**
   * Adds a header to the response header map.
   * @param name 
   * @param value 
   */
  public void addHeader(String name, String value) {}

  global Object clone() {}

}