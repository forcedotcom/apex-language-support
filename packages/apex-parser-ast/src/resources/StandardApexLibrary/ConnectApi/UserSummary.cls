/**
 * User summary.
 */
global class UserSummary extends ConnectApi.User {

  global UserSummary() {}

  /**
   * true if user is active; false otherwise.
   */
  global Boolean isActive;

  global Object clone() {}

}