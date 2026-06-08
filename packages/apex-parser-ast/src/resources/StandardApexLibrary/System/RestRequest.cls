/**
 * Use the System.RestRequest class to access and pass request data in a RESTful Apex method.
 */
global class RestRequest {

  global RestRequest() {}

  public Map<String, String> headers;

  public String httpMethod;

  public Map <String, String> params;

  public String remoteAddress;

  public Blob requestBody;

  public String requestURI;

  public String resourcePath;

  /**
   * Adds a header to the request header map in an Apex test.
   * @param name 
   * @param value 
   */
  public void addHeader(String name, String value) {}

  /**
   * Adds a parameter to the request params map in an Apex test.
   * @param name 
   * @param value 
   */
  public void addParameter(String name, String value) {}

  global Object clone() {}

}