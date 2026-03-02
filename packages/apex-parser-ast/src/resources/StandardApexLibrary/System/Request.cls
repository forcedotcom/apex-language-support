/**
 * Contains methods to obtain the request ID and Quiddity value of the current Salesforce request.
 */
public class Request {

  /**
   * Returns the current Request object that contains the request ID and Quiddity value.
   * @return System.Request
   */
  public static System.Request getCurrent() {}

  /**
   * Returns the Quiddity value of the current Request object.
   * @return System.Quiddity
   */
  public System.Quiddity getQuiddity() {}

  /**
   * Returns the request ID of the current Request object.
   * @return String
   */
  public String getRequestId() {}

}