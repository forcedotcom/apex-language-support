/**
 * Contains a list of evaluated conditions for a report notification.
 */
global class ThresholdInformation {

  global ThresholdInformation(List<Reports.EvaluatedCondition> evaluatedConditions) {}

  /**
   * Returns a list of evaluated conditions for a report notification.
   * @return List<Reports.EvaluatedCondition>
   */
  global List<Reports.EvaluatedCondition> getEvaluatedConditions() {}

  global Object clone() {}

}