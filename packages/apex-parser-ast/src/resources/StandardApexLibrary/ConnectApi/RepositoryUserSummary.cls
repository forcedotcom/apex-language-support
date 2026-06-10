/**
 * A user summary.
 */
global class RepositoryUserSummary extends ConnectApi.AbstractDirectoryEntrySummary {

  global RepositoryUserSummary() {}

  /**
   * First name of the user.
   */
  global String firstName;

  /**
   * Last name of the user.
   */
  global String lastName;

  global Object clone() {}

}