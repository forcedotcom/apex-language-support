/**
 * Contains the individual components of an evaluated condition for a report notification, such as the aggregate name and label, the operator, and the value that the aggregate is compared to.
 */
global class EvaluatedCondition {

  global EvaluatedCondition(String aggregateName, String aggregateLabel, Double compareToValue, Double aggregateValue, String displayCompareTo, String displayValue, Reports.EvaluatedConditionOperator operator) {}

  /**
   * Returns the localized display name of the aggregate.
   * @return String
   */
  global String getAggregateLabel() {}

  /**
   * Returns the unique API name of the aggregate.
   * @return String
   */
  global String getAggregateName() {}

  /**
   * Returns the value that the aggregate is compared to in the condition.
   * @return Double
   */
  global Double getCompareTo() {}

  /**
   * Returns the value that the aggregate is compared to in the condition, formatted for display. For example, a display value for a currency is $20.00 or USD20.00 instead of 20.00.
   * @return String
   */
  global String getDisplayCompareTo() {}

  /**
   * Returns the value of the aggregate when the report is run, formatted for display. For example, a display value for a currency is $20.00 or USD20.00 instead of 20.00.
   * @return String
   */
  global String getDisplayValue() {}

  /**
   * Returns the operator used in the condition.
   * @return Reports.EvaluatedConditionOperator
   */
  global Reports.EvaluatedConditionOperator getOperator() {}

  /**
   * Returns the actual value of the aggregate when the report is run.
   * @return Double
   */
  global Double getValue() {}

  global Object clone() {}

}