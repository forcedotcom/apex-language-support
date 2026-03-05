/**
 * Sends information about an authorization reversal request to a gateway adapter during a service call.
 */
global class AuthorizationReversalRequest {

  global AuthorizationReversalRequest(Double amount, String authorizationId) {}

  /**
   * Maintains the integrity of lists of type AuthorizationReversalRequest by determining the equality of external objects in a list. This method is dynamic and based on the equals method in Java.
   * @param obj External object whose key is to be validated.
   * @return Boolean
   */
  global Boolean equals(Object obj) {}

  /**
   * Maintains the integrity of lists of type AuthorizationReversalRequest by determining the uniqueness of the external object in a list.
   * @return Integer
   */
  global Integer hashCode() {}

  /**
   * Converts a date to a string.
   * @return String
   */
  global String toString() {}

}