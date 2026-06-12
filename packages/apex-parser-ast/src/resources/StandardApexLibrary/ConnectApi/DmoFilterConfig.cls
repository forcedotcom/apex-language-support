/**
 * Represents a DMO filter configuration output.
 */
global class DmoFilterConfig {

  global DmoFilterConfig() {}

  /**
   * List of activation DMO filters.
   */
  global List < ConnectApi.DmoFilter > filters;

  global Object clone() {}

}