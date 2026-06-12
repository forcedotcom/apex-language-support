/**
 * Represents an object used to pass data from an Apex RESTful Web service method to an HTTP response.
 */
global class RestResponse {

  global RestResponse() {}

  global Blob responseBody;

  global Map<String, String> headers;

  global Integer statuscode;

  /**
   * Adds a header to the response header map.
   * @param name 
   * @param value 
   */
  global void addHeader(String name, String value) {}

  global Object clone() {}

}