/**
 * Use the System.RestRequest class to access and pass request data in a RESTful Apex method.
 */
global class RestRequest {

  global RestRequest() {}

  global Map<String, String> headers;

  global String httpMethod;

  global Map <String, String> params;

  global String remoteAddress;

  global Blob requestBody;

  global String requestURI;

  global String resourcePath;

  /**
   * Adds a header to the request header map in an Apex test.
   * @param name 
   * @param value 
   */
  global void addHeader(String name, String value) {}

  /**
   * Adds a parameter to the request params map in an Apex test.
   * @param name 
   * @param value 
   */
  global void addParameter(String name, String value) {}

  global Object clone() {}

}