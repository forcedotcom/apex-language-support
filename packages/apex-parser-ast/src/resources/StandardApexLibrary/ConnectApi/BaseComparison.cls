/**
 * Represents the abstract class for a base comparison output.
 */
global class BaseComparison {

  /**
   * List of logical comparison filters.
   */
  global List < ConnectApi.TypeAndFilter > filters;

  /**
   * operator
   */
  global String operator;

}