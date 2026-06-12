/**
 * Represents the abstract class for a base comparison output.
 */
global class BaseComparison {

  global BaseComparison() {}

  /**
   * List of logical comparison filters.
   */
  global List < ConnectApi.TypeAndFilter > filters;

  /**
   * operator
   */
  global String operator;

  global Object clone() {}

}