/**
 * An HTTP request header name and value pair.
 */
global class RequestHeader {

  global RequestHeader() {}

  /**
   * The name of the request header.
   */
  global String name;

  /**
   * The value of the request header.
   */
  global String value;

  global Object clone() {}

}