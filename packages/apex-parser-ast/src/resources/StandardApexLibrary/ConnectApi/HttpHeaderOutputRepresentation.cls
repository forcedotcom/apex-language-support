/**
 * HTTP header with information about a text classification
 */
global class HttpHeaderOutputRepresentation {

  global HttpHeaderOutputRepresentation() {}

  /**
   * Name of the HTTP header.
   */
  global String name;

  /**
   * Value of the HTTP header.
   */
  global String value;

  global Object clone() {}

}