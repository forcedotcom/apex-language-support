/**
 * The Reports.EvaluatedConditionOperator enum describes the type of operator used to compare an aggregate to a value. It is returned by the getOperator method.
 */
global enum EvaluatedConditionOperator {
  EQUAL,
  GREATER_THAN,
  GREATER_THAN_EQUAL,
  LESS_THAN,
  LESS_THAN_EQUAL,
  NOT_EQUAL
}