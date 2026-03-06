/**
 * Represents the base comparison input.
 */
global class BaseComparisonInput {

  /**
   * Logical comparison input list wrapper.
   */
  global List < ConnectApi.TypeAndFilterInput > filtersConfig;

  /**
   * Operator of the comparison.
   */
  global String operator;

}