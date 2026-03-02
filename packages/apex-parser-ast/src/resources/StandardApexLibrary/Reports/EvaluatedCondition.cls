/**
 * Contains the individual components of an evaluated condition for a report notification, such as the aggregate name and label, the operator, and the value that the aggregate is compared to.
 */
public class EvaluatedCondition {

  /**
   * Returns the localized display name of the aggregate.
   * @return String
   */
  public String getAggregateLabel() {}

  /**
   * Returns the unique API name of the aggregate.
   * @return String
   */
  public String getAggregateName() {}

  /**
   * Returns the value that the aggregate is compared to in the condition.
   * @return Double
   */
  public Double getCompareTo() {}

  /**
   * Returns the value that the aggregate is compared to in the condition, formatted for display. For example, a display value for a currency is $20.00 or USD20.00 instead of 20.00.
   * @return String
   */
  public String getDisplayCompareTo() {}

  /**
   * Returns the value of the aggregate when the report is run, formatted for display. For example, a display value for a currency is $20.00 or USD20.00 instead of 20.00.
   * @return String
   */
  public String getDisplayValue() {}

  /**
   * Returns the operator used in the condition.
   * @return Reports.EvaluatedConditionOperator
   */
  public Reports.EvaluatedConditionOperator getOperator() {}

  /**
   * Returns the actual value of the aggregate when the report is run.
   * @return Double
   */
  public Double getValue() {}

}