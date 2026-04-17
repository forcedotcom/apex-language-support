/**
 * Sends information about an authorization request to a gateway adapter during a service call. This class extends the BaseRequest class and inherits all its methods.
 */
global class AuthorizationRequest {

  global AuthorizationRequest(Double amount) {}

  /**
   * Maintains the integrity of lists of type AuthorizationRequest by determining the equality of external objects in a list. This method is dynamic and based on the equals method in Java.
   * @param obj External object whose key is to be validated.
   * @return Boolean
   */
  global Boolean equals(Object obj) {}

  /**
   * Maintains the integrity of lists of type AuthorizationRequest by determining the uniqueness of the external object in a list.
   * @return Integer
   */
  global Integer hashCode() {}

  /**
   * Converts a date to a string.
   * @return String
   */
  global String toString() {}

}