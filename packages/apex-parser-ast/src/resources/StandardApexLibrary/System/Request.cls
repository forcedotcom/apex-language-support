/**
 * Contains methods to obtain the request ID and Quiddity value of the current Salesforce request.
 */
global class Request {

  global Request() {}

  /**
   * Returns the current Request object that contains the request ID and Quiddity value.
   * @return System.Request
   */
  global static System.Request getCurrent() {}

  /**
   * Returns the Quiddity value of the current Request object.
   * @return System.Quiddity
   */
  global System.Quiddity getQuiddity() {}

  /**
   * Returns the request ID of the current Request object.
   * @return String
   */
  global String getRequestId() {}

  global Object clone() {}

}