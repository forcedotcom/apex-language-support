/**
 * Represents the activation attribute filter expression.
 */
global class AttributeFilterExpression {

  /**
   * Conjunction for the activation attribute filter expression. FilterConjunctionAnd FilterConjunctionOr
   */
  global FilterConjunctionEnum conjunction;

  /**
   * List of attribute filters.
   */
  global List < ConnectApi.AttributeFilter > filters;

}