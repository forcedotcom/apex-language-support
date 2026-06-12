/**
 * Client information.
 */
global class ClientInfo {

  global ClientInfo() {}

  /**
   * Name of the connected app used for authentication.
   */
  global String applicationName;

  /**
   * Value from the Info URL field of the connected app used for authentication.
   */
  global String applicationUrl;

  global Object clone() {}

}